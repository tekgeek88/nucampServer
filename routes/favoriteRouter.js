const express = require('express');
const bodyParser = require('body-parser');
const Campsite = require('../models/campsite');
const User = require('../models/user');
const Favorite = require('../models/favorite');
const authenticate = require('../authenticate');

const favoriteRouter = express.Router();

const cors = require('./cors');

favoriteRouter.use(bodyParser.json());

favoriteRouter.route('/')
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, async (req, res, next) => {
    try {
      const favorites = await Favorite.find({"user": req.user._id})
        .populate('user')
        .populate('campsites');
      if (!favorites) {
        return res.status(200).json([])
      }

      return res.status(200).json(favorites);
    } catch (err) {
      next(err)
    }
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {
      // Get favorites for the given userId create one if not exists
      let favorite = await Favorite.findOne({"user": req.user._id});
      if (!favorite) {
        favorite = new Favorite({user: req.user._id, campsites: []});
      }
      // For each campsite in the given array insert the favorite campsite if not exists
      req.body.forEach(newCampsite => {
        const duplicates = favorite.campsites.filter(existingCampsite => String(existingCampsite._id) === String(newCampsite._id));
        if (!duplicates.length) {
          favorite.campsites.push(newCampsite);
        } else {
          console.log(`Not inserting duplicate: ${newCampsite._id}`)
        }
      });
      await favorite.save();
      // Fetch one with the latest data and populate the newly added fields
      favorite = await Favorite.findOne({"user": req.user._id})
        .populate("user")
        .populate("campsites");
      return res.status(200).json(favorite);
    } catch (err) {
      next(err)
    }
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites');
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {
      const favorite = await Favorite.findOne({"user": req.user._id});
      if (!favorite) {
        return res.status(400).json({
          success: false,
          message: `No favorites found for userId: ${req.user._id}`
        });
      } else {
        await favorite.delete();
        return res.status(200).json({
          success: true,
          message: `Deleted all favorites for userId: ${req.user._id}`
        });
      }
    } catch (err) {
      console.log(err);
      next(err)
    }
  });

favoriteRouter.route('/:campsiteId')
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {

      let campsite = await Campsite.findOne({"_id": req.params.campsiteId});
      if (!campsite) {
        return res.status(400).json({
          success: false,
          message: "The given campsite does not exists"
        });
      }

      // Get favorite for the given userId create one if not exists
      let favorite = await Favorite.findOne({"user": req.user._id});
      if (!favorite) {
        favorite = new Favorite({user: req.user._id, campsites: []});
      }

      // Insert the favorite campsite if one does not already exist
      const duplicates = favorite.campsites.filter(existingCampsite => String(existingCampsite._id) === String(req.params.campsiteId));
      if (!duplicates.length) {
        console.log("A")
        favorite.campsites.push({"_id": req.params.campsiteId});
        await favorite.save();
      } else {
        console.log("B")
        return res.status(400).json({
          success: false,
          message: "That campsite is already in the list of favorites!"
        });
      }

      // Fetch one with the latest data and populate the newly added fields
      favorite = await Favorite.findOne({"user": req.user._id})
        .populate("user")
        .populate("campsites");
      return res.status(200).json(favorite);
    } catch (err) {
      console.log(err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.send('PUT operation not supported on /favorites:campsiteId');
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {
      // Check if the campsite being deleted actual exisits
      let campsite = await Campsite.findOne({"_id": req.params.campsiteId});
      if (!campsite) {
        return res.status(400).json({
          success: false,
          message: "The given campsite does not exists"
        });
      }

      // Get favorite for the given userId create one if not exists
      let favorite = await Favorite.findOne({"user": req.user._id});
      if (!favorite) {
        return res.status(400).json({
          success: false,
          message: "No campsites exist for the given user!"
        })
      }

      // Get the index of the campsite
      const pos = favorite.campsites.indexOf(req.params.campsiteId);
      console.log("Pos: ", pos)
      if (pos > -1) {
        favorite.campsites.splice(pos, 1);
        await favorite.save();
        // Fetch one with the latest data and populate the newly added fields
        favorite = await Favorite.findOne({"user": req.user._id})
          .populate("user")
          .populate("campsites");
        return res.status(200).json(favorite);
      } else {
        return res.status(200).json({
          success: false,
          message: `Campsite: ${req.params.campsiteId} was not found`
        })
      }
    } catch (err) {
      console.log(err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  });

module.exports = favoriteRouter;