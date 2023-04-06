import { Formik, Field, Form } from 'formik';
import toast from 'react-hot-toast';
import { useState} from 'react';

type Props = {
    onLogin: () => void;
    username: string | undefined;
    password: string | undefined;
};

export default function LoginForm({ onLogin, username, password }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (values: { username: string, password: string }) => {
        setIsLoading(true);

        // Check if the entered username and password match the ones from the .env file
        if (values.username === username && values.password === password) {
            console.log('Credentials match.');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', values.username);
            onLogin();
        } else {
            console.log('Credentials do not match.');
            console.log('Username: ' + values.username);
            console.log('Password: ' + values.password);

            // If the authentication fails, show an error message
            toast.error('Invalid username or password.');
        }

        setIsLoading(false);
    };

    return (

        
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Formik
                initialValues={{
                    username: '',
                    password: '',
                }}
                onSubmit={handleSubmit}
            >
                <Form className="bg-white p-8 rounded-md shadow-md">
                    <h1 className="text-2xl font-medium text-gray-800 mb-4">Login</h1>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
                            Username
                        </label>
                        <Field
                            id="username"
                            name="username"
                            placeholder="Username"
                            className="border border-gray-300 p-2 rounded-md w-full"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                            Password
                        </label>
                        <Field
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Password"
                            className="border border-gray-300 p-2 rounded-md w-full"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </Form>
            </Formik>
        </div>
    );
}
