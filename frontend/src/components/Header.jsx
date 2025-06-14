import { Github, Code, FileText } from 'lucide-react';
import {Link} from 'react-router-dom';
const Header = () => {
  return (
    <header className="fixed top-0 w-full bg-black/90 backdrop-blur-md  border-gray-800 z-50">
      <div className="container mx-auto py-6 px-8 md:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
              <Code className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Jury Mate</h1>
              <p className="text-xs text-gray-400">Repository Analyzer</p>
            </div>
          </div>
          
          <div className='flex space-x-16'>
            {/* <nav className="hidden md:flex items-center space-x-8">
            <Link to='/' className="text-gray-300 hover:text-green-400 transition-colors duration-200">
              Home
            </Link>
            <Link to='/about' className="text-gray-300 hover:text-green-400 transition-colors duration-200">
              About
            </Link>
            <Link to='/contact'  className="text-gray-300 hover:text-green-400 transition-colors duration-200">
              Contact
            </Link>
          </nav> */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

