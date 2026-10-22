import { useLocation, useNavigate } from "react-router-dom";
import { pathFor, viewFromPath, type ViewId } from "../routes";

/** Router-backed replacement for the old `view`/`setView` store slice. */
export function useView(): { view: ViewId; setView: (view: ViewId) => void } {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return {
    view: viewFromPath(pathname),
    setView: (view: ViewId) => {
      const path = pathFor(view);
      if (path) navigate(path);
    },
  };
}
