import { Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import propTypes from 'prop-types'
import { CURRENT_USER_QUERY } from './User'

const SIGNGOUT_QUERY = gql`
    mutation SIGNGOUT_QUERY {
        signout {
            message 
        }
    }
`

const Signout = props => (
    <Mutation {...props} 
        mutation={SIGNGOUT_QUERY}
        refetchQueries={[{ query: CURRENT_USER_QUERY }]}
        >
        {payload => props.children(payload)}
    </Mutation>
)

Signout.propTypes = {
    children: propTypes.func.isRequired,
}

export default Signout
export { CURRENT_USER_QUERY }
