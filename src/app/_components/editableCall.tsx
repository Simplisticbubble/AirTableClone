import { useEffect, useState } from "react";

const EditableCell = (headerTitle: string | null | undefined) => {
  const [value, setValue] = useState(headerTitle ?? "");
  useEffect(() => {
    setValue(headerTitle ?? "");
  }, [headerTitle]);
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full border-none bg-transparent focus:outline-none"
    ></input>
  );
};
export default EditableCell;
