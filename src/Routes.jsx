import { createBrowserRouter, RouterProvider } from "react-router-dom";
import KanbanPage from "./pages/Kanban.jsx";
import Login from "./pages/Login.jsx";


import ProtectedRoute from "./components/ProtectedRoutes.jsx";
import App from "./App.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login /> },
  { path: "/kanban", element: <ProtectedRoute><KanbanPage /></ProtectedRoute> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
