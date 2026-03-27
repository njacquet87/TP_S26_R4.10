import Rental from "../models/Rental.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";

// @desc    Louer un film
// @route   POST /api/rentals
// @access  Private
export const createRental = async (req, res, next) => {
  try {
    const { movieId } = req.body;
    const userId = req.user._id;

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film non trouvé",
      });
    }

    if (!movie.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Ce film n'est pas disponible à la location",
      });
    }

    const existingRental = await Rental.findOne({
      user: userId,
      movie: movieId,
      status: "active",
      expiryDate: { $gt: new Date() },
    });

    if (existingRental) {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà loué ce film",
        rental: existingRental,
      });
    }

    const rental = await Rental.create({
      user: userId,
      movie: movieId,
      price: movie.price,
    });

    await rental.populate("movie", "title poster price duration");

    res.status(201).json({
      success: true,
      message: "Film loué avec succès",
      data: rental,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les locations d'un utilisateur
// @route   GET /api/rentals/my-rentals
// @access  Private
export const getMyRentals = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    let query = { user: userId };

    if (status === "active") {
      query.status = "active";
      query.expiryDate = { $gt: new Date() };
    } else if (status === "expired") {
      query.$or = [
        { status: "expired" },
        { status: "cancelled" },
        { expiryDate: { $lt: new Date() } },
      ];
    }

    const rentals = await Rental.find(query)
      .populate("movie", "title poster price duration genre year rating")
      .sort({ rentalDate: -1 });

    res.status(200).json({
      success: true,
      count: rentals.length,
      data: rentals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir toutes les locations (admin)
// @route   GET /api/rentals
// @access  Private/Admin
export const getAllRentals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const rentals = await Rental.find(query)
      .populate("user", "name email")
      .populate("movie", "title poster price")
      .sort({ rentalDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rental.countDocuments(query);

    res.status(200).json({
      success: true,
      count: rentals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: rentals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Annuler une location
// @route   DELETE /api/rentals/:id
// @access  Private
export const cancelRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: "Location non trouvée",
      });
    }

    if (rental.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à annuler cette location",
      });
    }

    if (rental.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cette location ne peut pas être annulée",
      });
    }

    rental.status = "cancelled";
    await rental.save();

    res.status(200).json({
      success: true,
      message: "Location annulée avec succès",
      data: rental,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des locations
// @route   GET /api/rentals/stats
// @access  Private/Admin
export const getRentalStats = async (req, res, next) => {
  try {
    const totalRentals = await Rental.countDocuments();
    const activeRentals = await Rental.countDocuments({ status: "active" });
    const expiredRentals = await Rental.countDocuments({ status: "expired" });

    const totalRevenue = await Rental.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$price" },
        },
      },
    ]);

    const topMovies = await Rental.aggregate([
      {
        $group: {
          _id: "$movie",
          count: { $sum: 1 },
          revenue: { $sum: "$price" },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movieDetails",
        },
      },
      {
        $unwind: "$movieDetails",
      },
      {
        $project: {
          title: "$movieDetails.title",
          poster: "$movieDetails.poster",
          count: 1,
          revenue: 1,
        },
      },
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rentalsByMonth = await Rental.aggregate([
      {
        $match: {
          rentalDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$rentalDate" },
            month: { $month: "$rentalDate" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$price" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRentals,
          activeRentals,
          expiredRentals,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        topMovies,
        rentalsByMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir des recommandations personnalisées
// @route   GET /api/rentals/recommendations
// @access  Private
export const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const rentals = await Rental.find({ user: userId }).populate("movie");
    const rentedMovieIds = rentals
      .map((rental) => (rental.movie ? rental.movie._id : null))
      .filter(Boolean);

    let genres = [];
    rentals.forEach((rental) => {
      if (rental.movie && rental.movie.genre) {
        genres.push(...rental.movie.genre);
      }
    });

    const uniqueGenres = [...new Set(genres)];

    let recommendations = [];

    if (uniqueGenres.length > 0) {
      recommendations = await Movie.find({
        genre: { $in: uniqueGenres },
        _id: { $nin: rentedMovieIds },
        isAvailable: true,
      })
        .sort({ rating: -1 })
        .limit(10);
    } else {
      const user = await User.findById(userId);
      if (user && user.favoriteGenres && user.favoriteGenres.length > 0) {
        recommendations = await Movie.find({
          genre: { $in: user.favoriteGenres },
          isAvailable: true,
        })
          .sort({ rating: -1 })
          .limit(10);
      } else {
        recommendations = await Movie.find({ isAvailable: true })
          .sort({ rentalCount: -1, rating: -1 })
          .limit(10);
      }
    }

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};