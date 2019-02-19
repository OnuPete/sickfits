import React, { Component } from 'react'
import { Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import PropTypes from 'prop-types'

import Form from './styles/Form'
import Error from './ErrorMessage'
import { CURRENT_USER_QUERY } from './User'

const RESET_MUTATION = gql`
    mutation RESET_MUTATION($resetToken: String!, $password: String!, $confirmPassword: String!) {
        resetPassword(
            resetToken: $resetToken
            password: $password
            confirmPassword: $confirmPassword
        ) {
            name
            email
        }
    }
`

export default class Reset extends Component {
    static propTypes = {
        resetToken: PropTypes.string.isRequired,
    }
    state = {
        password: '',
        confirmPassword: '',
    }

    saveToState = ({ target }) => {
        this.setState({ [target.name]: target.value })
    }
    render() {
        return (
            <Mutation
                mutation={RESET_MUTATION}
                variables={{
                    resetToken: this.props.resetToken,
                    password: this.state.password,
                    confirmPassword: this.state.confirmPassword,
                }}
                refetchQueries={[{ query: CURRENT_USER_QUERY }]}
            >
                {(reset, { error, loading, called }) => (
                    <Form
                        method="post"
                        onSubmit={async e => {
                            e.preventDefault()
                            await reset()
                            this.setState({
                                password: '',
                                confirmPassword: '',
                            })
                        }}
                    >
                        <fieldset disabled={loading} aria-busy={loading}>
                            <h2>Reset your Password</h2>
                            <Error error={error} />
                            <label htmlFor="password">
                                Enter new Password
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="password"
                                    value={this.state.password}
                                    onChange={this.saveToState}
                                />
                            </label>
                            <label htmlFor="confirmPassword">
                                Confirm Password
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="confirmPassword"
                                    value={this.state.confirmPassword}
                                    onChange={this.saveToState}
                                />
                            </label>
                            <button type="submit">Reset Password!</button>
                        </fieldset>
                    </Form>
                )}
            </Mutation>
        )
    }
}
