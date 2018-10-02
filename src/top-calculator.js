"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = require("lodash");
const GetMatchesRequest_1 = require("./models/GetMatchesRequest");
const TabTRequestor_1 = require("./TabTRequestor");
const week_1 = require("./week");
class TopCalculator {
    constructor() {
        this.tabt = new TabTRequestor_1.TabTRequestor();
        this.journee = new week_1.Week();
        this.config = {
            'rankings': [
                {
                    name: 'Huy-Waremme',
                    clubs: ['L360', 'L123'],
                },
                {
                    name: 'Verviers',
                    clubs: ['L360', 'L123'],
                },
                {
                    name: 'Liège',
                    clubs: ['L360', 'L123'],
                },
            ],
            'categories': [
                {
                    'name': 'NAT/WB',
                    'divisions': [123, 123],
                },
                {
                    'name': 'Provincial 1',
                    'divisions': [123, 123],
                },
                {
                    'name': 'Provincial 2',
                    'divisions': [123, 123],
                },
                {
                    'name': 'Provincial 3',
                    'divisions': [123, 123],
                },
                {
                    'name': 'Provincial 4',
                    'divisions': [123, 123],
                },
                {
                    'name': 'Provincial 5',
                    'divisions': [123, 123],
                },
                {
                    'name': 'Provincial 6',
                    'divisions': [123, 123],
                },
            ],
        };
    }
    start() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const currentWeek = this.journee.getCurrentJournee();
            const clubs = this.getAllClubs();
            console.log(currentWeek);
            // Step 1 Download and Upsert documents
            for (let i = 1; i < currentWeek; i = i + 1) {
                console.log(`--- Journee ${i}`);
                for (const club of clubs) {
                    console.log(`--- Resultats de ${club}`);
                    const getMatchRequest = new GetMatchesRequest_1.GetMatchesRequest();
                    getMatchRequest.WeekName = i.toString();
                    getMatchRequest.Club = club;
                    getMatchRequest.WithDetails = true;
                    const matchs = yield this.tabt.getMatches(getMatchRequest);
                    console.log(matchs);
                }
            }
        });
    }
    getAllClubs() {
        return _.flatten(this.config.rankings.map((ranking) => ranking.clubs));
    }
}
exports.TopCalculator = TopCalculator;
//# sourceMappingURL=top-calculator.js.map