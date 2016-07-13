exports.voucher = require('./voucher');
exports.user = require('./user');

/*
 * GET home page.
 */

exports.index = function(req, res, next) {
	var Voucher = Parse.Object.extend("Voucher");
	var query = new Parse.Query(Voucher);
	query.find({
		success: function(vouchers) {
			res.render("index", { vouchers: vouchers });
		}, error: function(error) {
			return next(error);
		}
	});
};
