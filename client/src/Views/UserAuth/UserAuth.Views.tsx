'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
    useLoginUserMutation,
    useRegisterUserMutation,
    useGetCurrentUserQuery 
} from '@/redux/UserSlice/UserSlice';
import { setAuthCredentials } from '@/redux/globalSlice/globalSlice';
import Loader from '@/components/Loader/Loader.component';
import './UserAuth.css';
import { RootState } from '@/redux/store';

const UserAuth: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: RootState) => state.global);
    const { 
        data: sessionData, 
        isLoading: isSessionLoading 
    } = useGetCurrentUserQuery(undefined, { skip: isAuthenticated });

    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const [loginUser, { isLoading: isLoginLoading }] = useLoginUserMutation();
    const [registerUser, { isLoading: isRegLoading }] = useRegisterUserMutation();

    useEffect(() => {
        if (sessionData?.success && sessionData?.data) {
            dispatch(setAuthCredentials({
                user: {
                    id: sessionData.data.id,
                    name: sessionData.data.name,
                    email: sessionData.data.email
                }
            }));
        }
    }, [sessionData, dispatch]);
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let response;
            if (isLogin) {
                response = await loginUser({ 
                    email: formData.email, 
                    password: formData.password 
                }).unwrap();
            } else {
                response = await registerUser(formData).unwrap();
            }

            if (response.success && response.data) {
                dispatch(setAuthCredentials({
                    user: {
                        id: response.data.id,
                        name: response.data.name,
                        email: response.data.email
                    }
                }));
                router.push('/');
            }
        } catch (err: any) {
            const errorMessage = err.data?.message || "Authentication failed.";
            alert(errorMessage);
        }
    };

    if (isAuthenticated || isSessionLoading || isLoginLoading || isRegLoading) {
        return <Loader />;
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">{isLogin ? 'Login' : 'Create Account'}</h2>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="auth-btn">
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <p className="auth-switch">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <span 
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setFormData({ name: '', email: '', password: '' });
                        }}
                    >
                        {isLogin ? ' Register here' : ' Login here'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default UserAuth;