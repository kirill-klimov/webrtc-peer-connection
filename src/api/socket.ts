import { connect } from 'socket.io-client'

const url = import.meta.env.PROD ? '/' : (import.meta.env.VITE_API || ''); 

const socket = connect(url)

export { socket }