const axios = require("axios").default;
const Endpoint = require("./extensions/endpoints");
const { format } = require("util");

const platformsAvailable = [
  "uplay",
  "stadia",
  "xbl",
  "psn"
];

const summitPlatforms = [
  "pc",
  "x1",
  "ps4",
  "stadia"
];

class TheCrew2 {
  constructor(email, password) {
    this.email = email;
    this.password = password;
  }

  refreshToken() {
    return new Promise((resolve, reject) => {
      axios({
        method: "PUT",
        url: Endpoint.SESSION_URL,
        headers: {
          Authorization: "Ubi_v1 t=" + this.ticket,
          "Content-Type": "application/json",
          "Ubi-AppId": "dda77324-f9d6-44ea-9ecb-30e57b286f6d",
        }
      }).then(session => {
        this.ticket = session.data.ticket;
        this.sessionId = session.data.sessionId;
        this.expiration = session.data.expiration;
        resolve(this.expiration);
      }).catch(err => {
        throw new Error(`Error in Token refresh. Err: ${err}`);
      });
    });
  }

  checkToken() {
    let actualDate = new Date();
    let expiryDate = new Date(new Date(this.expiration) - (20 * 60000));
    if (this.ticket && this.expiration && expiryDate < actualDate) {
      this.refreshToken();
    }
  }

  login() {
    return new Promise((resolve, reject) => {
      axios({
        method: "POST",
        url: Endpoint.SESSION_URL,
        headers: {
          Authorization: "Basic " + Buffer.from(this.email + ":" + this.password).toString("base64"),
          "Content-Type": "application/json",
          "Ubi-AppId": "dda77324-f9d6-44ea-9ecb-30e57b286f6d",
        }
      }).then(session => {
        this.ticket = session.data.ticket;
        this.sessionId = session.data.sessionId;
        this.expiration = session.data.expiration;
        this.tokenCheckInterval = setInterval(() => {
          this.checkToken();
        }, 1000);
        resolve(this.expiration);
      }).catch(err => {
        throw new Error(`Error in authentication, are the credentials correct? Err ${err}`);
      });
    });
  }

  searchForNames(platform, names) {
    return new Promise((resolve, reject) => {
      if (!platformsAvailable.includes(platform)) throw new Error("Invalid platform type, should be: " + platformsAvailable.join(", "));
      names = typeof names === Array ? names.join(",") : names;
      axios({
        method: "GET",
        url: Endpoint.PROFILE_URL,
        headers: {
          Authorization: "Ubi_v1 t=" + this.ticket,
          "Content-Type": "application/json",
          "Ubi-AppId": "dda77324-f9d6-44ea-9ecb-30e57b286f6d",
          "Ubi-SessionId": this.sessionId
        },
        params: {
          platformType: platform,
          namesOnPlatform: names
        }
      }).then(user => {
        resolve(user.data.profiles.length > 1 ? user.data.profiles : user.data.profiles[0]);
      }).catch(err => {
        throw new Error(`Are the parameters correct? Err: ` + err);
      });
    });
  }

  getSummits() {
    return new Promise((resolve, reject) => {
      axios({
        method: "GET",
        url: Endpoint.SUMMITS_URL,
        headers: {
          "Content-Type": "application/json",
        }
      }).then(summit => {
        resolve(summit.data);
      }).catch(err => {
        throw new Error(`Issue getting summits? Err: ` + err);
      });
    });
  }

  getCurrentSummit() {
    return new Promise((resolve, reject) => {
      axios({
        method: "GET",
        url: Endpoint.SUMMITS_URL,
        headers: {
          "Content-Type": "application/json",
        }
      }).then(summit => {
        resolve(summit.data[0]);
      }).catch(err => {
        throw new Error(`Issue getting current summit? Err: ` + err);
      });
    });
  }

  getGameData(data = ["missions", "skills", "brands", "models"]) {
    return new Promise((resolve, reject) => {
      data = typeof data === Array ? data.join(",") : data;
      axios({
        method: "GET",
        url: Endpoint.GAMEDATA_URL,
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          fields: data.join(",")
        }
      }).then(gameData => {
        resolve(gameData.data);
      }).catch(err => {
        throw new Error(`Are the parameters correct? Err: ` + err);
      });
    });
  }

  getGameStrings(languageCode = "en") {
    return new Promise((resolve, reject) => {
      axios({
        method: "GET",
        url: format(Endpoint.LOCALE_URL, languageCode),
        headers: {
          "Content-Type": "application/json",
        }
      }).then(locale => {
        resolve(locale.data);
      }).catch(err => {
        throw new Error(`Are the parameters correct? Err: ` + err);
      });
    });
  }

  getUserProfilePicture(userId) {
    if (userId.userId) userId = userId.userId;
    return new Promise((resolve, reject) => {
      axios({
        method: "GET",
        url: format(Endpoint.PICTURE_URL, userId),
        headers: {
          "Content-Type": "application/json",
        }
      }).then(picture => {
        resolve(picture.data);
      }).catch(err => {
        throw new Error(`Are the parameters correct? Err: ` + err);
      });
    });
  }

  getSummitRanking(userId, platform = "pc", summitId) {
    if (userId.userId) userId = userId.userId;
    if (!summitPlatforms.includes(platform)) throw new Error("Invalid platform type, should be: " + summitPlatforms.join(", "));

    return new Promise((resolve, reject) => {
      if (summitId || this.summitId) {
        axios({
          method: "GET",
          url: format(Endpoint.SUMMIT_DATA_URL, this.summitId, platform, userId),
          headers: {
            "Content-Type": "application/json",
          }
        }).then(summit => {
          resolve(summit.data);
        }).catch(err => {
          throw new Error(`Are the parameters correct? Err: ` + err);
        });
      } else {
        axios({
          method: "GET",
          url: Endpoint.SUMMITS_URL,
          headers: {
            "Content-Type": "application/json",
          }
        }).then(summit => {
          this.summitId = summit.data[0].id;
          summitId = this.summitId;
          axios({
            method: "GET",
            url: format(Endpoint.SUMMIT_DATA_URL, summitId, platform, userId),
            headers: {
              "Content-Type": "application/json",
            }
          }).then(summitData => {
            resolve(summitData.data);
          }).catch(err => {
            throw new Error(`Are the parameters correct? Err: ` + err);
          });
        }).catch(err => {
          throw new Error(`Issue with getting latest summit? Err: ` + err);
        });
      }
    });
  }

  getFameLeaderboards(platform = "pc", userId) {
    if (!summitPlatforms.includes(platform)) throw new Error("Invalid platform type, should be: " + summitPlatforms.join(", "));
    return new Promise((resolve, reject) => {
      const params = userId ? {profile_id: userId} : {};
      axios({
        method: "GET",
        url: format(Endpoint.FAME_LEADERBOARD_URL, platform),
        headers: {
          "Content-Type": "application/json",
        },
        params: params
      }).then(leaderboard => {
        resolve(leaderboard.data);
      }).catch(err => {
        throw new Error(`Are the parameters correct? Err: ` + err);
      });
    });
  }

  getSummitLeaderboard(platform = "pc", pageSize, after, summitId) {
    if (!summitPlatforms.includes(platform)) throw new Error("Invalid platform type, should be: " + summitPlatforms.join(", "));

    let params = {};
    if (pageSize) { params["page_size"] = pageSize; }
    if (after) { params["after"] = after; }

    return new Promise((resolve, reject) => {
      if (summitId || this.summitId) {
        axios({
          method: "GET",
          url: format(Endpoint.SUMMIT_LEADERBOARD_URL, summitId, platform),
          headers: {
            "Content-Type": "application/json",
          }
        }).then(summit => {
          resolve(summit.data);
        }).catch(err => {
          throw new Error(`Are the parameters correct? Err: ` + err);
        });
      } else {
        axios({
          method: "GET",
          url: Endpoint.SUMMITS_URL,
          headers: {
            "Content-Type": "application/json",
          }
        }).then(summit => {
          this.summitId = summit.data[0].id;
          summitId = this.summitId;
          axios({
            method: "GET",
            url: format(Endpoint.SUMMIT_LEADERBOARD_URL, summitId, platform),
            headers: {
              "Content-Type": "application/json",
            },
            params: params
          }).then(summitData => {
            resolve(summitData.data);
          }).catch(err => {
            throw new Error(`Are the parameters correct? Err: ` + err);
          });
        }).catch(err => {
          throw new Error(`Issue with getting latest summit? Err: ` + err);
        });
      }
    });
  }
}

module.exports = TheCrew2;