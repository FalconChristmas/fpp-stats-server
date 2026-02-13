const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({
    auth: process.env.API_KEY
});


/**
 * Class to query GitHub for FPP branch and commit information and caching the results.
 */
class GithubQuery {
    constructor() {
        this.baseDir = process.env.GITHUB_CACHE_DIR || "/tmp/github"
        this.commitDir = this.baseDir + "/commits";
        if (!fs.existsSync(this.commitDir)) {
            console.log('Creating dir ' + this.commitDir);
            fs.mkdirSync(this.commitDir, { recursive: true });
        }
    }

    /**
     * 
     * @returns {string} The full path to the file containing the branch and commit
     */

    getSummaryFileName() {
        return this.baseDir + "/branch_details.json";
    }

    /**
     * Prints the authenticated user's information to the console. -- Used for debuging purposes.
     */
    async getUserInfo() {
        const user = await octokit.users.getAuthenticated();
        console.log(user.data);

    }

    /**
     * Finds all the current Branches for FPP and returns them as an array of branch objects.
     * @returns {Promise} A promise that resolves to an array of branch objects
     */
    async _getBranches() {
        let page = 1;
        let rc = [];
        let cnt = 0;
        do {
            console.log("GetBranches: Page: " + page);
            const response = await octokit.request("GET /repos/{owner}/{repo}/branches?page={page}", {
                owner: "FalconChristmas",
                repo: "fpp",
                page: page
            });
            cnt = response.data.length;
            rc = rc.concat(response.data);
            page++;
        } while (cnt > 0);

        return rc;
    }

    /**
    * Finds all the current Releases for FPP and returns them as an array of release objects.
    * @returns {Promise} A promise that resolves to an array of release objects
    */
    async _getReleases() {
        let page = 1;
        let rc = [];
        let cnt = 0;
        do {
            console.log("GetReleases: Page: " + page);
            const response = await octokit.request("GET /repos/{owner}/{repo}/releases?page={page}", {
                owner: "FalconChristmas",
                repo: "fpp",
                page: page
            });
            cnt = response.data.length;
            rc = rc.concat(response.data);
            page++;
        } while (cnt > 0);

        for (const release of rc) {
            delete release.assets_url;
            delete release.upload_url;
            release.asset_cnt = release.assets.length;
            delete release.assets;
            delete release.tarball_url;
            delete release.zipball_url;
            delete release.author;
        }

        return rc;
    }

    /**
     * REturns details of a specific commit from local cache or GitHub.
     * @param {string} hash The commit hash to retrieve
     * @returns Object The commit details
     */
    async _getCommit(hash) {
        if (fs.existsSync(this.commitDir + "/" + hash + ".json")) {
            //console.log("Cache hit for " + hash);
            return JSON.parse(fs.readFileSync(this.commitDir + "/" + hash + ".json"));
        }
        const response = await octokit.request("GET /repos/{owner}/{repo}/commits/{hash}", {
            owner: "FalconChristmas",
            repo: "fpp",
            hash: hash
        });
        fs.writeFileSync(this.commitDir + "/" + hash + ".json", JSON.stringify(response.data));
        return response.data;
    }

    /**
     * Updates the local cache with the latest branch and commit information from the GitHub.
     * 
     * This method retrieves the list of branches from the repository, fetches the latest commit for each branch,
     * and updates the branch information with commit details such as message, date, URL, and epoch date.
     * The branches are then sorted by commit date in descending order, and the updated information is saved
     * to a JSON file in the local cache directory.
     * 
     * @async
     * @throws {Error} If there is an error while updating the cache.
     */
    async updateCache() {
        try {
            let releases = await this._getReleases();
            let branches = await this._getBranches();
            for (let i = 0; i < branches.length; i++) {
                let branch = branches[i];
                let branchSha = branch.commit.sha;
                let branchCommit = await this._getCommit(branchSha);
                branch.commit['message'] = branchCommit.commit.message;
                branch.commit['date'] = branchCommit.commit.author.date;
                branch.commit['url'] = branchCommit.url;
                branch.commit['date_epoch'] = Math.floor(new Date(branchCommit.commit.author.date).getTime() / 1000);
            }
            // Support by commit date
            branches.sort((a, b) => b.commit.date_epoch - a.commit.date_epoch);

            // Create file record to be served by the server
            let answer = {
                branches: branches,
                releases: releases,
                last_updated: new Date().toISOString()
            }
            console.log("Saving Branch_details");
            fs.writeFileSync(this.getSummaryFileName(), JSON.stringify(answer, null, 4));

        } catch (error) {
            console.error("Error updating cache:", error);
        }
    }

}

module.exports = GithubQuery