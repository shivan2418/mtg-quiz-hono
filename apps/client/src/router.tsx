import { createBrowserRouter } from "react-router-dom";
import { Root } from "./routes/__root";
import { Home } from "./routes/index";
import { Quiz } from "./routes/quiz";
import { SignIn } from "./routes/signin";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: "quiz/:quizId", element: <Quiz /> },
      { path: "signin", element: <SignIn /> },
    ],
  },
]);
