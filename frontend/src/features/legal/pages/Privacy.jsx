import LegalLayout from "../components/LegalLayout";

const Privacy = () => (
  <LegalLayout
    eyebrow="Mosaic"
    title="Privacy"
    intro="Mosaic keeps a small record of the people, photos and conversations on it. This page explains what is stored, where it goes, and how to export or remove it."
  >
    <section>
      <h2>Account details</h2>
      <p>
        We store your email address, your username, an optional bio, a profile
        image URL, and a bcrypt hash of your password. The password itself is
        never stored in readable form. Account records also keep the date they
        were created and last updated.
      </p>
    </section>

    <section>
      <h2>Photos and posts</h2>
      <p>
        Each post stores a reference to the image file, its ImageKit URLs (the
        original and the generated thumbnails), an optional caption, and a
        timestamp. Image files themselves are stored in ImageKit. Mosaic keeps
        the ImageKit URL in MongoDB and asks ImageKit to serve resized versions
        for the feed and the profile grid.
      </p>
      <p>
        Posts, captions, profiles and comments are public. Any visitor can read
        the Explore page and any member profile without an account. Do not post
        anything you need to keep private.
      </p>
    </section>

    <section>
      <h2>Likes, comments and follows</h2>
      <p>
        We store likes (which member liked which post), comments (the text,
        author username, post and timestamp), and follow relationships (who
        follows whom). Comments are stored in the comments collection. The
        counts shown on the feed and profiles are calculated from this data.
      </p>
    </section>

    <section>
      <h2>Cookies and sessions</h2>
      <p>
        Signing in sets a single cookie named <strong>token</strong>. It holds a
        JSON Web Token (JWT) that identifies your session. The cookie is
        httpOnly, SameSite=Lax, and Secure when the site runs in production. It
        expires after one day.
      </p>
      <p>
        We do not use advertising cookies. Vercel Analytics records aggregate
        page views without cookies.
      </p>
      <p>
        When you log out, the token is added to a blacklist in MongoDB so it
        cannot be reused. Blacklist entries are deleted automatically after 24
        hours. Changing your password increments a session version on the
        account, which immediately invalidates every token issued before the
        change.
      </p>
    </section>

    <section>
      <h2>Third-party processors</h2>
      <p>Mosaic relies on these providers to run:</p>
      <ul>
        <li>
          <strong>Vercel</strong> serves the frontend and runs Vercel Analytics.
        </li>
        <li>
          <strong>Render</strong> runs the API, receives requests, and may keep
          operational logs.
        </li>
        <li>
          <strong>MongoDB Atlas</strong> stores account, post, like, comment,
          follow and blacklist records.
        </li>
        <li>
          <strong>ImageKit</strong> stores and serves image files and
          transformed thumbnails.
        </li>
      </ul>
      <p>
        Each provider handles data under its own terms and privacy policy.
        Mosaic does not control their retention periods, and these providers
        may process data outside your country.
      </p>
    </section>

    <section>
      <h2>Retention</h2>
      <p>
        Account details, posts, likes, comments and follows stay while your
        account exists and the content is not deleted. Deleted posts lose their
        MongoDB record, likes and comments. The image file may stay in ImageKit
        at its URL, as described below.
      </p>
      <p>
        Logout blacklist entries expire within 24 hours. Provider logs and
        backups follow each provider&rsquo;s own retention periods, and copies
        of deleted records may remain there for a limited time. Mosaic does not
        keep separate analytics profiles.
      </p>
    </section>

    <section>
      <h2>Deleting content and accounts</h2>
      <p>
        You can delete your own posts from the post actions. That removes the
        database record, its likes, and its comments. The original image may
        remain available at its ImageKit URL after the post is deleted.
      </p>
      <p>
        You can delete your account from Settings. That removes the account
        record, posts, comments, likes and follow relationships, and ends the
        current session. The same page can prepare a JSON export of those
        records. ImageKit image files are not deleted by account deletion, so
        they may remain available at their URLs. Email{" "}
        <a href="mailto:furqank219@gmail.com">furqank219@gmail.com</a> if you
        need help or want to ask about files tied to a deleted account. Some
        copies may remain for a short time in provider backups or caches.
      </p>
    </section>

    <section>
      <h2>Your questions</h2>
      <p>
        Ask about your data, request a copy, or request a correction or deletion
        by emailing{" "}
        <a href="mailto:furqank219@gmail.com">furqank219@gmail.com</a>. This
        page describes the service as it works today and does not claim any
        certification or formal compliance status.
      </p>
      <p>
        We may update this page as the product changes. The date above shows
        the latest revision.
      </p>
    </section>
  </LegalLayout>
);

export default Privacy;
