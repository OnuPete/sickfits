const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const Query = {
    items: forwardTo('db'),
    item: forwardTo('db'),
    itemsConnection: forwardTo('db'),
    me(parent, args, ctx, info) {
        // check if there is a current user id
        if (!ctx.request.userId) {
            return null
        }
        return ctx.db.query.user(
            {
                where: { id: ctx.request.userId },
            },
            info
        )
    },
    async users(parent, args, ctx, info) {
        // check if they are logged in
        if (!ctx.request.userId) {
            throw new Error('Must be logged in to continue')
        }
        // check if user has permission to view all userss
        hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])
        return ctx.db.query.users({}, info)
    },
}

module.exports = Query
