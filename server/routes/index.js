module.exports = [
  {
    method: "GET",
    path: "/",
    handler: (request, h) => {
      console.log("redirecting. Shouldn't be calling / ");
      return h.redirect("http://falconchristmas.com/");
    },
  },
];
