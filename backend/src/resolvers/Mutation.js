const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomBytes } = require('crypto')
const { promisify } = require('util')
const randomBytesPromisified = promisify(randomBytes)

const { transport, makeANiceEmail } = require('../mail')
const { hasPermission } = require('../utils')

const Mutations = {
    async createItem(parent, { title, description, price, image, largeImage }, ctx, info) {
        // TODO: Check if they are logged in
        if (!ctx.request.userId) {
            throw new Error('You must be signed in to to that!')
        }

        const item = await ctx.db.mutation.createItem(
            {
                data: {
                    user: {
                        connect: {
                            id: ctx.request.userId,
                        },
                    },
                    title,
                    description,
                    price,
                    image,
                    largeImage,
                },
            },
            info
        )

        return item
    },
    updateItem(parent, args, ctx, info) {
        const updates = { ...args }
        delete updates.id
        return ctx.db.mutation.updateItem(
            {
                data: updates,
                where: {
                    id: args.id,
                },
            },
            info
        )
    },
    async deleteItem(parent, args, ctx, info) {
        const where = { id: args.id }
        //find item
        const item = await ctx.db.query.item({ where }, `{ id title user { id }}`)
        // TODO: check if they own item
        const ownsItem = item.user.id === ctx.request.userId
        const hasPermissions = ctx.request.user.permissions.some(permission =>
            ['ADMIN', 'ITEMDELETE'].includes(permission)
        )

        if (!ownsItem && hasPermissions) {
            throw new Error("You don't have permission to do that!")
        }
        // delete it
        return ctx.db.mutation.deleteItem({ where }, info)
    },
    async signup(parent, args, ctx, info) {
        args.email = args.email.toLowerCase()
        const password = await bcrypt.hash(args.password, 10)
        const user = await ctx.db.mutation.createUser(
            {
                data: {
                    name: args.name,
                    email: args.email,
                    password,
                    permissions: { set: ['USER'] },
                },
            },
            info
        )
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        })
        return user
    },
    async signin(parent, { email, password }, ctx, info) {
        const user = await ctx.db.query.user({ where: { email } })
        if (!user) {
            throw new Error(`No such user found for email ${email}`)
        }
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new Error('Invalid Password')
        }
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 30,
        })
        return user
    },
    signout(parent, args, ctx, info) {
        ctx.response.clearCookie('token')
        return { message: 'successfully logged out' }
    },
    async requestReset(parent, args, ctx, info) {
        // Check if this is a real user
        const user = await ctx.db.query.user({ where: { email: args.email } })
        if (!user) {
            throw new Error(`No such user found for email ${args.email}`)
        }
        // Set a reset token and expiry on that user
        const resetToken = (await randomBytesPromisified(20)).toString('hex')
        const resetTokenExpiry = Date.now() + 3600000
        const res = await ctx.db.mutation.updateUser({
            where: { email: args.email },
            data: { resetToken, resetTokenExpiry },
        })
        // Email them that reset token
        const email = await transport.sendMail({
            from: 'peter.rey.car@gmail.com',
            to: user.email,
            subject: 'Your Password Reset Token',
            html: makeANiceEmail(`Your Password Reset Token is here!
            \n\n
            <a href="${
                process.env.FRONTEND_URL
            }/reset?resetToken=${resetToken}">Click Here to Reset</a>
            `),
        })
        return { message: 'success' + res.resetToken }
    },
    async resetPassword(parent, { resetToken, password, confirmPassword }, ctx, info) {
        // Check if passwords match
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match')
        }
        // Verify resetToken
        const [user] = await ctx.db.query.users({
            where: {
                resetToken,
                resetTokenExpiry_gte: Date.now() - 3600000,
            },
        })
        if (!user) {
            throw new Error('Invalid or expired reset token')
        }
        // Hash new password
        const passwordHashed = await bcrypt.hash(password, 10)
        // Save new password and remove old resetToken fields
        const updatedUser = await ctx.db.mutation.updateUser({
            where: { email: user.email },
            data: {
                password: passwordHashed,
                resetToken: null,
                resetTokenExpiry: null,
            },
        })
        // Generate Jwt
        const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET)
        // Set new Jwt cookie
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        })
        // return new user
        return updatedUser
    },
    async updatePermissions(parent, args, ctx, info) {
        // 1. Check if they are logged in
        if (!ctx.request.userId) {
            throw new Error('You must be logged in!')
        }
        // 2. query the current user
        const currentUser = await ctx.db.query.user(
            {
                where: {
                    id: ctx.request.userId,
                },
            },
            info
        )
        // 3. check if they have permissions to do this
        hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE'])
        // 4. Update the permissions
        return await ctx.db.mutation.updateUser(
            {
                data: {
                    permissions: {
                        set: args.permissions,
                    },
                },
                where: {
                    id: args.userId,
                },
            },
            info
        )
    },
    async addToCart(parent, args, ctx, info) {
        // 1. Make sure they are signed in
        const { userId } = ctx.request
        if (!userId) {
            throw new Error('You must be logged in!')
        }
        // 2. Query the users current cart
        const [existingCartItem] = await ctx.db.query.cartItems(
            {
                where: {
                    user: { id: userId },
                    item: { id: args.id },
                },
            },
            info
        )
        // 3. Check if that itme is already in their cart, then increment by 1 if it is
        if (existingCartItem) {
            console.log('This item is already in their cart')
            return ctx.db.mutation.updateCartItem(
                {
                    where: { id: existingCartItem.id },
                    data: { quantity: existingCartItem.quantity + 1 },
                },
                info
            )
        }
        // 4. if its not, create a fresh cart item for that user
        return ctx.db.mutation.createCartItem(
            {
                data: {
                    user: {
                        connect: { id: userId },
                    },
                    item: {
                        connect: { id: args.id },
                    },
                },
            },
            info
        )
    },
    async removeFromCart(parent, args, ctx, info) {
        const { userId } = ctx.request
        if (!userId) {
            throw new Error('You must must be logged in')
        }
        // 1. Find the Cart Item
        const cartItem = await ctx.db.query.cartItem(
            {
                where: { id: args.id },
            },
            `{ id user { id } }`
        )
        if (!cartItem) throw new Error('No Cart Item Found!')
        // 2. Make sure that they own that cart Item
        if (cartItem.user.id !== ctx.request.userId) {
            throw new Error('Item does not belong')
        }
        // 3. Delete that cart item
        return ctx.db.mutation.deleteCartItem(
            {
                where: {
                    id: args.id,
                },
            },
            info
        )
    },
}

module.exports = Mutations
