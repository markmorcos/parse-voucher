/*
 * GET index voucher API.
 */

exports.index = function(req, res, next) {
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	if (req.params.code) query.equalTo("code", req.params.code);
	if (req.query.username) query.equalTo("username", req.query.username);
	query.find({
		success: function(vouchers) {
			res.send({ vouchers: vouchers });
		}, error: function(error) {
			return next(error);
		}
	});
};

/*
 * GET show voucher page.
 */

exports.show = function(req, res, next) {
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	if (req.params.code) query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			res.render("vouchers/show", { voucher: voucher.toJSON(), bundles: req.bundles });
		}, error: function(error) {
			return next(error);
		}
	});
};

/*
 * GET new voucher page.
 */

exports.new = function(req, res, next) {
	if (!req.body.title) res.render("vouchers/new", { bundles: req.bundles });
};

/*
 * POST create voucher API.
 */

exports.create = function(req, res, next) {
	if (!req.body["characters[]"]) res.send({ error: true, code: 401, message: "You must choose at least 1 character." });
	req.body["characters[]"] = typeof req.body["characters[]"] === 'string' || req.body["characters[]"] instanceof String ? [req.body["characters[]"]] : req.body["characters[]"];
	var codes = voucher_codes.generate({ length: req.body.code ? 3 : 6, count: req.body.count, prefix: req.body.code ? req.body.code + "-" : "" });
	var vouchers = [];
	var Voucher = Parse.Object.extend("Voucher");
	for (i in codes) {
		var voucher = new Voucher();
		voucher.set("code", codes[i]);
		voucher.set("central", req.body.central == undefined ? false : true);
		voucher.set("usageLimit", Number(req.body.usageLimit));
		voucher.set("startTimestamp", req.body.startTimestamp);
		voucher.set("endTimestamp", req.body.endTimestamp);
		voucher.set("characters", req.body.characters);
		voucher.set("username", req.body.username);
		voucher.set("tradable", req.body.tradable == undefined ? false : true);
		voucher.set("characters", req.body["characters[]"]);
		voucher.set("deleted", false);
		vouchers.push(voucher);
	}
	Parse.Object.saveAll(vouchers, {
		success: function(vouchers) {
			res.redirect("/", 200, { voucher: voucher.toJSON(), error: "Voucher(s) created." });
		}, error: function(error) {
			console.log(error);
			return next(error);
		}
	});
};

/*
 * GET edit voucher page.
 */

exports.edit = function(req, res, next) {
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			res.render("vouchers/edit", { voucher: voucher.toJSON(), bundles: req.bundles });
		}, error: function(error) {
			return next(error);
		}
	});
};

/*
 * PUT update voucher API.
 */

exports.update = function(req, res, next) {
	if (!req.params.code) return next(new Error("No voucher code."));
	req.body["characters[]"] = typeof req.body["characters[]"] === 'string' || req.body["characters[]"] instanceof String ? [req.body["characters[]"]] : req.body["characters[]"];
	var code = voucher_codes.generate({ length: req.body.code ? 3 : 6, prefix: req.body.code ? req.body.code + "-" : "" }).pop();
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			if (!voucher) return next(new Error("No voucher found."));
			voucher.set("code", req.body.code == voucher.get("code") ? voucher.get("code") : code);
			voucher.set("central", req.body.central == undefined ? false : true);
			voucher.set("usageLimit", Number(req.body.usageLimit));
			voucher.set("startTimestamp", req.body.startTimestamp);
			voucher.set("endTimestamp", req.body.endTimestamp);
			voucher.set("characters", req.body["characters[]"]);
			voucher.set("username", req.body.username);
			voucher.set("tradable", req.body.tradable == undefined ? false : true);
			voucher.save(null, {
				success: function(voucher) {
			res.redirect("/vouchers/" + voucher.toJSON().code, 200, { voucher: voucher.toJSON(), error: "Voucher updated." });
				}, error: function(voucher, error) {
					console.log(error);
					return next(error);
				}
			})
		}, error: function(error) {
			return next(error);
		}
	});
};

exports.assign = function(req, res, next) {
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			res.render("vouchers/assign", { voucher: voucher.toJSON() });
		}, error: function(error) {
			return next(error);
		}
	});
};

/*
 * PUT assign voucher API.
 */

exports.doAssign = function(req, res, next) {
	if (!req.params.code) return next(new Error("No voucher code."));
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			if (!voucher) return next(new Error("No voucher found."));
			voucher.set("username", req.body.username == undefined ? voucher.get("username") : req.body.username);
			voucher.save(null, {
				success: function(voucher) {
					res.redirect("/vouchers/" + voucher.toJSON().code, 200, { voucher: voucher.toJSON(), error: "Voucher assigned." });
				}, error: function(error) {
					return next(error);
				}
			});
		}, error: function(error) {
			return next(error);
		}
	});
};

/*
 * POST activate voucher API.
 */

exports.activate = function(req, res, next) {
	if (!req.params.code) return next(new Error("No voucher code."));
	if (!req.body.username) return next(new Error("No username."));
	if (!req.body.character) return next(new Error("No character chosen."));
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			if (!voucher) return next(new Error("No voucher found."));
			var usageLimit = voucher.get("usageLimit");
			if (usageLimit == 0) {
				return next(new Error("Voucher not available." ));
			} else {
				if (usageLimit != -1) {
					voucher.set("usageLimit", usageLimit - 1);
					voucher.save(null, {
						success: function(voucher) {
							res.send({ voucher: voucher });
						}, error: function(error) {
							return next(error);
						}
					});
				}
				var query = new Parse.Query(Parse.User);
				query.equalTo("username", req.body.username);
				query.first({
					success: function(user) {
						if (!user) return next(new Error("User not found."));
						var ownedBundles = user.get("ownedBundles");
						if (ownedBundles[req.body.character]) return next(new Error("Character already owned."));
						ownedBundles[req.body.character] = Date.now();
						user.set("ownedBundles", ownedBundles);
						var ownedVouchers = user.get("ownedVouchers");
						if (ownedVouchers[req.params.code]) return next(new Error("Voucher already claimed."));
						ownedVouchers[req.params.code] = Date.now();
						user.set("ownedVouchers", ownedVouchers);
						user.save(null, {
							success: function(user) {
								res.send({ success: true });
							}, error: function(user, error) {
								return next(error);
							}
						});
					}, error: function(error) {
						return next(error);
					}
				});
			}
		}, error: function(error) {
			return next(error);
		}
	});
};

/*
 * DELETE delete voucher API.
 */

exports.delete = function(req, res, next) {
	if (!req.params.code) return next(new Error("No voucher code."));
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.equalTo("deleted", false);
	query.equalTo("code", req.params.code);
	query.first({
		success: function(voucher) {
			if (!voucher) return next(new Error("No voucher found."));
			voucher.set("deleted", true);
			voucher.save(null, {
				success: function(voucher) {
					res.redirect("/", 200, { error: "Voucher deleted." });
				}, error: function(error) {
					return next(error);
				}
			});
		}, error: function(error) {
			return next(error);
		}
	});
};
