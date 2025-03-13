const HttpError=require('../models/http-error');
const {validationResult}=require('express-validator');
const getCoordinates = require('../util/location');
const Place=require('../models/place');
const User =require('../models/user');
const mongoose = require('mongoose');
const cloudinary = require("cloudinary").v2;
const fs=require('fs');

const getPlaceById =async(req,res,next)=>{
    const placeId=req.params.pid;
    let place;
    try
    {
         place =await Place.findById(placeId);
    }
    catch(err)
    {
       const error=new HttpError('Something went wrong ,could not find a place ',500);
       return next(error);
    }

    if(!place)
    {
        const error= new HttpError('Could not find a place for the provided id.');  
        return next(error);  
    }
    res.json({place:place.toObject({getters:true})});//{place}=>{place:place} Since findById() returns a single document (object) or null, we convert it to a plain object:
};

const getPlacesByUserId =async(req,res,next)=>{
    const userId=req.params.uid;
    //let places;
    let userWithPlace
    try
    {
        // places=await Place.find({creator: userId});
        userWithPlace =await User.findById(userId).populate('places');

    }
    catch(err)
    {
        const error=new HttpError('Fetching places failed,please try again later ',500);
       return next(error);
    }

    if(!userWithPlace || userWithPlace.places.length === 0)
    {
       return next(new HttpError('Could not find  places for the provided user id.'));
    }
    
    res.json({places :userWithPlace.places.map(place =>place.toObject({getters:true}))}); //find() returns an array of objects, not a single object.  
}



const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed, please check your data", 422));
  }

  const { title, description, address } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded!" });
  }

  // ✅ Upload image to Cloudinary
  let imageUrl;
  try {
    const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "places", // ✅ Store in "places" folder
      transformation: [{ width: 500, height: 500, crop: "limit" }], // ✅ Resize image
    });
    imageUrl = cloudinaryResult.secure_url; // ✅ Get Cloudinary URL
  } catch (err) {
    console.error("❌ Cloudinary Upload Error:", err);
    return next(new HttpError("Image upload failed. Please try again.", 500));
  }

  // ✅ Get coordinates for address
  let coordinates;
  try {
    coordinates = await getCoordinates(address);
    if (!coordinates) {
      return next(new HttpError("Could not fetch coordinates for the provided address.", 500));
    }
  } catch (error) {
    return next(new HttpError("Could not fetch coordinates for the provided address.", 500));
  }

  // ✅ Create Place object
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: imageUrl, // ✅ Store Cloudinary URL in DB
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError("Could not find user for provided ID", 404));
    }
  } catch (err) {
    return next(new HttpError("Fetching user failed, please try again", 500));
  }

  // ✅ Mongoose Transaction for Atomicity
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });

    await sess.commitTransaction();
    sess.endSession();
  } catch (err) {
    return next(new HttpError("Creating place failed. Please try again.", 500));
  }

  res.status(201).json({ place: createdPlace });
};




const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    
    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
        if (!place) {
            return next(new HttpError('Could not find a place for the provided ID.', 404));
        }
    } catch (err) {
        return next(new HttpError('Fetching place failed, please try again later.', 500));
    }

    if(place.creator.toString() !== req.userData.userId){
        const error=new HttpError(
            'You are not allowed to edit this place.',401);
        return next(error);
    }

    // ✅ Ensure updates are correctly applied
    place.title = title ; 
    place.description = description ;
    
    try {
        await place.save();
    } catch (err) {
        return next(new HttpError('Updating place failed, please try again later.', 500));
    }

    // ✅ Ensure the response format matches expected output
    res.status(200).json({ places: place.toObject({ getters: true }) });
};


const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId).populate("creator");
    } catch (err) {
        return next(new HttpError("Something went wrong, could not delete place.", 500));
    }

    if (!place) {
        return next(new HttpError("Could not find place for this id.", 404));
    }

    if (place.creator.id !== req.userData.userId) {
        return next(new HttpError("You are not allowed to delete this place.", 401));
    }

    const imagePath = place.image;
    const publicId = imagePath.split("/").pop().split(".")[0];

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();

        await place.deleteOne({ session: sess });

        if (!place.creator) {
            return next(new HttpError("Could not find the creator for this place.", 500));
        }

        place.creator.places.pull(place._id);
        await place.creator.save({ session: sess });

        await sess.commitTransaction();
        sess.endSession();
        
        // Delete image from Cloudinary
        await cloudinary.uploader.destroy(publicId);

    } catch (err) {
        return next(new HttpError("Something went wrong, could not delete place.", 500));
    }

    res.status(200).json({ message: "Deleted place" });
};


module.exports={getPlaceById,getPlacesByUserId,createPlace,updatePlace,deletePlace}