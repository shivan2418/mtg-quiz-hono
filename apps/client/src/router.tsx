import { createBrowserRouter } from "react-router-dom";
import { Root } from "./routes/__root";
import { Home } from "./routes/index";
import { Quiz } from "./routes/quiz";
import { Create } from "./routes/create";
import { NewQuiz } from "./routes/new-quiz";
import { SignIn } from "./routes/signin";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: "quiz/:quizId", element: <Quiz /> },
      { path: "newQuiz", element: <NewQuiz /> },
      { path: "customQuiz", element: <Create /> },
      { path: "signin", element: <SignIn /> },
    ],
  },
]);
