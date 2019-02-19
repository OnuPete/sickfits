import React, { Component } from 'react'
import { Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import Form from './styles/Form'
import Error from './ErrorMessage'

const REQUEST_RESET_MUTATION = gql`
    mutation REQUEST_RESET_MUTATION($email: String!) {
        requestReset(email: $email) {
            message
        }
    }
`

export default class RequestReset extends Component {
    state = {
        email: '',
    }

    saveToState = ({ target }) => {
        this.setState({ [target.name]: target.value })
    }
    render() {
        return (
            <Mutation mutation={REQUEST_RESET_MUTATION} variables={this.state}>
                {(requestReset, { error, loading, called }) => (
                    <Form
                        method="post"
                        onSubmit={async e => {
                            e.preventDefault()
                            await requestReset()
                            this.setState({
                                email: '',
                            })
                        }}
                    >
                        <h2>Password recovery</h2>
                        {!error && !loading && called && (
                            <p>Success! Check your email for reset link.</p>
                        )}
                        <Error error={error} />
                        <fieldset disabled={loading} aria-busy={loading}>
                            <label htmlFor="email">
                                Email
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="email"
                                    value={this.state.email}
                                    onChange={this.saveToState}
                                />
                            </label>
                            <button type="submit">Request Reset</button>
                        </fieldset>
                    </Form>
                )}
            </Mutation>
        )
    }
}
