import Reset from '../components/Reset'

const reset = props => (
    <div>
        <Reset resetToken={props.query.resetToken}></Reset>
    </div>
)

export default reset