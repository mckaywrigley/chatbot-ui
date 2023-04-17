export const Checkbox = (
  props: React.InputHTMLAttributes<HTMLInputElement>,
) => {
  return (
    <input
      type="checkbox"
      className="form-checkbox cursor-pointer h-5 w-5 text-indigo-600 transition duration-150 ease-in-out rounded-sm border-2 border-indigo-600 checked:bg-indigo-600 checked:border-transparent focus:outline-none focus:shadow-outline-indigo"
      {...props}
    />
  );
};
