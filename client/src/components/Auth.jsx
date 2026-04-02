import React, { useState } from 'react';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';

const Auth = ({ onLogin, onBack }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const url = isLogin ? 'http://localhost:3000/login' : 'http://localhost:3000/register';
            const res = await axios.post(url, formData);
            if (isLogin) {
                onLogin(res.data.token, res.data.id, res.data.username, res.data.role);
            } else {
                setIsLogin(true);
                setFormData({ username: '', email: '', password: '', first_name: '', last_name: '' });
                alert('Registration successful! Please login.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans p-4 relative">
            <button 
                onClick={onBack}
                className="absolute top-8 left-8 flex items-center gap-2 px-5 py-3 bg-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-gray-50 transition-all border-4 border-white group"
            >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Home
            </button>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-4 border-white">
                <div className="mb-10 text-center">
                    <h2 className="text-4xl font-black text-gray-900 mb-2 italic">{isLogin ? 'Welcome Back' : 'Join Cloud'}</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Personal Storage System</p>
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold uppercase tracking-widest text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Doe"
                                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                            <input
                                type="text"
                                placeholder="johndoe"
                                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input
                            type="email"
                            placeholder="name@company.com"
                            className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95 mt-4"
                    >
                        {isLogin ? 'Sign In to Cloud' : 'Create My Account'}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-gray-400 font-bold text-xs">
                        {isLogin ? "Don't have an account yet?" : "Already have an account?"}
                    </p>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="mt-2 text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline"
                    >
                        {isLogin ? 'Get Started' : 'Back to Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
