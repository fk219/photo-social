import {RouterProvider} from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import {routes} from "./app.routes"
import "./features/shared/global.scss"

import { AuthProvider } from "./features/auth/auth.context"
import { SocialProvider } from "./features/social/social.context"
import { PostContextProvider } from "./features/posts/post.context"

function App() {

  return (
    <>
      <AuthProvider>
        <SocialProvider>
          <PostContextProvider>
            <RouterProvider router={routes} />
          </PostContextProvider>
        </SocialProvider>
      </AuthProvider>
      <Analytics />
    </>
  )
}

export default App
