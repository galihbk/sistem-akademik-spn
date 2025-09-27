import { useEffect, useState } from 'react'
import { checkToken } from '../api/auth'

export default function useAuth(){
  const [ready,setReady]=useState(false)
  const [authed,setAuthed]=useState(false)

  useEffect(()=>{
    (async()=>{
      const token = await window.authAPI.getToken()
      if(token){ setAuthed(await checkToken(token)) }
      setReady(true)
    })()
  },[])

  const logout = async ()=>{ await window.authAPI.clearToken(); setAuthed(false) }

  return { ready, authed, setAuthed, logout }
}
