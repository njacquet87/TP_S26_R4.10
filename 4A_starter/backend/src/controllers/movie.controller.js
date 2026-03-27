import Movie from "../models/Movie.js";
import User from "../models/User.js"; 

// @desc    Obtenir tous les films
// @route   GET /api/movies
// @access  Public
export const getAllMovies = async (req, res, next) => {
  try {
    if (req.query.search) {
      const movies = await Movie.search(req.query.search);
      return res.status(200).json({
        success: true,
        count: movies.length,
        data: movies,
      });
    }

    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const movies = await Movie.find({ isAvailable: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un film par ID
// @route   GET /api/movies/:id
// @access  Public
export const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouveau film
// @route   POST /api/movies
// @access  Private/Admin
export const createMovie = async (req, res, next) => {
  try {
    const movie = await Movie.create(req.body);

    res.status(201).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Modifier un film
// @route   PUT /api/movies/:id
// @access  Private/Admin
export const updateMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
      new: true, 
      runValidators: true,
    });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un film
// @route   DELETE /api/movies/:id
// @access  Private/Admin
export const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: {}, 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des films
// @route   GET /api/movies/stats
// @access  Private/Admin
export const getMovieStats = async (req, res, next) => {
  try {
    const stats = await Movie.getStatsByGenre();

    const totalMovies = await Movie.countDocuments();
    const totalRevenue = await Movie.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$price", "$rentalCount"] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalMovies,
        estimatedRevenue: totalRevenue[0]?.total || 0,
        byGenre: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les films similaires
// @route   GET /api/movies/:id/similar
// @access  Public
export const getSimilarMovies = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film non trouvé",
      });
    }

    const similarMovies = await Movie.find({
      genre: { $in: movie.genre },
      _id: { $ne: movie._id },
      isAvailable: true,
    })
      .sort({ rating: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      count: similarMovies.length,
      data: similarMovies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les films les plus populaires
// @route   GET /api/movies/popular
// @access  Public
export const getPopularMovies = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const movies = await Movie.getPopularMovies(limit);

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les films récemment ajoutés
// @route   GET /api/movies/recent
// @access  Public
export const getRecentMovies = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const movies = await Movie.getRecentMovies(limit);

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les films d'un genre spécifique
// @route   GET /api/movies/genre/:genre
// @access  Public
export const getMoviesByGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const movies = await Movie.getByGenre(genre);

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les films dans une fourchette de prix
// @route   GET /api/movies/price?min=0&max=10
// @access  Public
export const getMoviesByPriceRange = async (req, res, next) => {
  try {
    const minPrice = parseFloat(req.query.min) || 0;
    const maxPrice = parseFloat(req.query.max) || 1000;
    const movies = await Movie.getByPriceRange(minPrice, maxPrice);

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques par genre
// @route   GET /api/movies/stats/genre
// @access  Public
export const getStatsByGenre = async (req, res, next) => {
  try {
    const stats = await Movie.getStatsByGenre();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les recommandations basées sur les genres préférés de l'utilisateur
// @route   GET /api/movies/recommendations
// @access  Private
export const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    }

    if (!user.favoriteGenres || user.favoriteGenres.length === 0) {
      const popularMovies = await Movie.getPopularMovies(10);
      return res.status(200).json({
        success: true,
        count: popularMovies.length,
        data: popularMovies,
      });
    }

    const recommendations = await Movie.find({
      genre: { $in: user.favoriteGenres },
      isAvailable: true,
    })
      .sort({ rating: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Liker un film
// @route   POST /api/movies/:id/like
// @access  Private
export const likeMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: "Film non trouvé" });
    }

    if (!movie.likes.includes(req.user.id)) {
      movie.likes.push(req.user.id);
      await movie.save();
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unliker un film
// @route   POST /api/movies/:id/unlike
// @access  Private
export const unlikeMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: "Film non trouvé" });
    }

    movie.likes = movie.likes.filter(
      (userId) => userId.toString() !== req.user.id.toString()
    );
    await movie.save();

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les films likés par un utilisateur
// @route   GET /api/movies/liked
// @access  Private
export const getLikedMoviesByUser = async (req, res, next) => {
  try {
    const movies = await Movie.getLikedByUser(req.user.id);

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir des films aléatoires
// @route   GET /api/movies/random
// @access  Public
export const getRandomMovies = async (req, res, next) => {
  try {
    let limit = parseInt(req.query.limit) || 10;
    if (limit > 10) limit = 10; 
    
    const randomMovies = await Movie.getRandomMovies(limit);

    res.status(200).json({
      success: true,
      count: randomMovies.length,
      data: randomMovies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Noter un film
// @route   POST /api/movies/:id/rate
// @access  Private
export const rateMovie = async (req, res, next) => {
  try {
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        message: "La note doit être comprise entre 0 et 10",
      });
    }

    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { rating },
      { new: true, runValidators: true }
    );

    if (!movie) {
      return res.status(404).json({ success: false, message: "Film non trouvé" });
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};