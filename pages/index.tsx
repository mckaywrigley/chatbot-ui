// export { default, getServerSideProps } from './api/home';
import { useState } from 'react';
import Link from 'next/link';
import LoginPage from './LoginPage';

function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Change the initial value to true

  // Check if the user is logged in
  if (isLoggedIn) {
    // Render the chat with bot component
    return <div>Chat with bot</div>;
  } else {
    // Render the login page
    return <LoginPage />;
  }
}

// Inside the component's render function or JSX block
<Link href="/login">
  <a>Login</a>
</Link>

export default HomePage;
