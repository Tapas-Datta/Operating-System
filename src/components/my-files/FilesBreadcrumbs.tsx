import { getBreadcrumbs } from "../../utils/fileUtils";

type Props = {
  path: string;
  onNavigate: (path: string) => void;
};

export default function FilesBreadcrumbs({ path, onNavigate }: Props) {
  const parts = getBreadcrumbs(path);

  return (
    <div className="myfiles-breadcrumbs">
      <button onClick={() => onNavigate("")}>Home</button>
      {parts.map((part, index) => {
        const target = parts.slice(0, index + 1).join("/");
        return (
          <span key={target} className="myfiles-crumb">
            <span>/</span>
            <button onClick={() => onNavigate(target)}>{part}</button>
          </span>
        );
      })}
    </div>
  );
}
