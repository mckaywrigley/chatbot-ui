export const LoginInput = (
  {
    label,
    value,
    onChange,
    type
  } : {
    label: string,
    value: string,
    onChange: (e: any) => void,
    type: string
  }
) => {
  return (
    <div className="flex flex-col">
      <label className="text-sm mb-2" style={{color: '#fff'}}>{label}</label>
      <input
        className="text-black border-2 border-black rounded-md p-2"
        type={type}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}