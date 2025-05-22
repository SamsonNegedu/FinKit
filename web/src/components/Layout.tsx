import React from 'react';
import { BarChart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow">
                <div className="w-full max-w-7xl mx-auto py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <BarChart className="h-7 w-7 mr-2 text-blue-500" />
                                Transaction Analyzer
                            </h1>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    to="/"
                                    className={`border-b-2 text-sm font-medium px-1 pt-1 ${location.pathname === '/'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        }`}
                                >
                                    Standard View
                                </Link>
                                <Link
                                    to="/llm"
                                    className={`border-b-2 text-sm font-medium px-1 pt-1 ${location.pathname === '/llm'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        }`}
                                >
                                    AI-Powered View
                                </Link>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 sm:mt-0">
                            Upload your transaction data and gain insights
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-grow py-6">
                {children}
            </main>

            <footer className="bg-white border-t mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-sm text-center text-gray-500">
                        Transaction Analyzer © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout; 
