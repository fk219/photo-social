import { Link } from "react-router-dom";
import LegalLayout from "../components/LegalLayout";

const Terms = () => (
  <LegalLayout
    eyebrow="Mosaic / Terms"
    title="Terms"
    accent="of use."
    intro="Mosaic is an early, small image-first conversation service. These terms cover the basics of using it."
  >
    <section>
      <h2>
        <span className="legal-index">01</span> Beta service
      </h2>
      <p>
        Mosaic is in beta. Features may change, break, or be removed, and the
        service may be paused or discontinued. Keep your own copies of any
        photograph you care about. We do not promise that content will be
        preserved.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">02</span> Your account
      </h2>
      <p>
        Provide accurate account details, keep your password private, and use
        only your own account. You are responsible for activity that happens
        through your session. You must be old enough to agree to these terms
        where you live.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">03</span> Acceptable use
      </h2>
      <p>Do not use Mosaic to:</p>
      <ul>
        <li>
          upload content that is illegal, hateful, harassing, sexually
          exploitative, or designed to harm people;
        </li>
        <li>upload images you do not have the rights to share;</li>
        <li>impersonate another person or misrepresent who took a photograph;</li>
        <li>
          access accounts, data, or systems you do not own, or probe, scan, or
          overload the service;
        </li>
        <li>scrape, spam, or distribute malware.</li>
      </ul>
      <p>
        We may remove content or restrict accounts that break these rules.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">04</span> Your photographs
      </h2>
      <p>
        You keep ownership of the photographs you upload. By posting a frame,
        you give Mosaic permission to store, resize, and display that image and
        the take attached to it so the service can show them in the feed, on
        your public portfolio, and in related views. Deleting a frame removes
        it from Mosaic, but the image file may remain at its ImageKit URL. The
        deletion process is described in the{" "}
        <Link to="/privacy">privacy notes</Link>. Email us if you want the file
        removed.
      </p>
      <p>
        You are responsible for making sure you have the rights to upload each
        photograph.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">05</span> Upload rules
      </h2>
      <p>
        Uploads must be JPEG, PNG, or WebP files up to 5 MB. Images are
        compressed in the browser before upload. Do not upload content that is
        illegal, abusive, or that you do not have permission to share. We may
        remove any upload that breaks these terms.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">06</span> Termination
      </h2>
      <p>
        You can stop using Mosaic at any time and delete your account from
        Settings. We may suspend or remove an account or content if it breaks
        these terms, creates risk for other people, or if we need to protect the
        service.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">07</span> No warranty
      </h2>
      <p>
        Mosaic is provided as is and as available, without warranties of any
        kind. We do not promise uninterrupted access, error-free operation, or
        that any content will be kept. To the extent the law allows, Mosaic is
        not liable for lost data, lost access, or indirect or incidental
        damages.
      </p>
    </section>

    <section>
      <h2>
        <span className="legal-index">08</span> Contact
      </h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:furqank219@gmail.com">furqank219@gmail.com</a>.
      </p>
    </section>
  </LegalLayout>
);

export default Terms;
