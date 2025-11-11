import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Kanban from "./pages/Kanban.jsx";
import Login from "./pages/Login.jsx";


import ProtectedRoute from "./components/ProtectedRoutes.jsx";
import App from "./App.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login /> },
  { path: "/kanban", element: <ProtectedRoute><App /></ProtectedRoute> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
