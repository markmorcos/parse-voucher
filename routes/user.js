/*
 * GET login page.
 */

exports.login = function(req, res, next) {
	res.render("login");
};

/*
 * GET logout route.
 */

exports.logout = function(req, res, next) {
	Parse.User.logOut();
	res.redirect("/");
};


/*
 * POST authenticate route.
 */

exports.authenticate = function(req, res, next) {
	if (!req.body.username || !req.body.password) return res.render("login", { error: "Please enter your username and password." });
	Parse.User.logIn(req.body.username, req.body.password, {
		success: function(user) {
			if (!user) return res.render("login", { error: "Invalid username/password." });
			Parse.User.enableUnsafeCurrentUser();
			Parse.User.become(user.getSessionToken(), function(user) {
				res.redirect("/");
			}, function (error) {
				res.render("login", { error: error.message });
			});
		}, error: function(user, error) {
			res.render("login", { error: error.message });
		}
	});
};
