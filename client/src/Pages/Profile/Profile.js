import React from "react";
import Footer from "../../Component/Layout/Footer";

const Profile = ({ user }) => {
  return (
    <div>
      <div className="min-h-screen bg-white dark:bg-gray-700">
        <div className="pt-10 flex justify-center items-center">
          {user && (
            <div className="flex flex-col items-center w-96 bg-white rounded shadow-2xl overflow-hidden">
              <div className="relative w-full">
                <div className="pb-40%" />
                <img
                  alt="cover"
                  src="https://images.unsplash.com/photo-1553095066-5014bc7b7f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8d2FsbCUyMGJhY2tncm91bmR8ZW58MHx8MHx8&w=1000&q=80"
                  className="absolute top-0 left-0 w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col items-center -mt-14">
                <img
                  alt={user.name}
                  src="https://www.shareicon.net/data/512x512/2016/05/24/770137_man_512x512.png"
                  className="relative rounded-full w-40 h-40"
                />
                <div className="flex mt-5">
                  <h3 className="font-body font-bold text-lg">{user.name}</h3>
                  <h4 className="font-body text-lg ml-3">26</h4>
                </div>
                <h5 className="font-body mt-2"> {"Email: " + user.email}</h5>
                <h5 className="font-body mt-2"> {"Phone: " + user.phone}</h5>
              </div>
              <hr className="w-full mt-6" />
              {/* <div className="flex justify-around w-full py-6 px-6">
            <div className="flex w-20 flex-col items-center">
              <h5 className="font-body font-bold text-lg">
                80K
              </h5>
              <p className="font-body text-xs tracking-widest mt-1">
                Followers
              </p>
            </div>
            <div className="flex w-20 flex-col items-center">
              <h5 className="font-body font-bold text-lg">803K</h5>
              <p className="font-body text-xs tracking-widest mt-1">Likes</p>
            </div>
            <div className="flex w-20 flex-col items-center">
              <h5 className="font-body font-bold text-lg">1.4K</h5>
              <p className="font-body text-xs tracking-widest mt-1">Photos</p>
            </div>
          </div> */}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
