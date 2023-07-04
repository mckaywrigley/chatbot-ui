import React from 'react'

type Props = {
    email: string;
    avatar: string;
}

export default function UserInfo({email, avatar}: Props) {
  if(avatar===undefined){
    avatar='https://placehold.co/150x150.png';
  }
  return (
    <div className='flex gap-2 items-center w-full px-3 py-1'>
        <div>
            <img src={avatar} alt={`${email} avatar`} className='max-h-6'/>
        </div>
        <div>
            {email}
        </div>
    </div>
  )
}