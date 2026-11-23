import {RouterProvider} from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import {routes} from "./app.routes"
import "./features/shared/global.scss"

import { AuthProvider } from "./features/auth/auth.context"
import { PostContextProvider } from "./features/posts/post.context"

function App() {

  return (
    <>
      <AuthProvider>
        <PostContextProvider>
          <RouterProvider router={routes} />
        </PostContextProvider>
      </AuthProvider>
      <Analytics />
    </>
  )
}

export default App
