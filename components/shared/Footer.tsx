const Footer = () => {
  return (
    <footer className='mt-auto w-full'>
      <div className='bg-primary text-white text-center py-5'>
        <span>&copy; </span>
        <span>{new Date().getFullYear()} </span>
        <span>Pizza Hub. All rights reserved.</span>
      </div>
    </footer>
  );
};

export default Footer;
