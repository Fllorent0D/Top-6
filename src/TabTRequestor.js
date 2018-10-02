"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const soap_1 = require("soap");
class TabTRequestor {
    constructor() {
        this.stub = 'https://resultats.aftt.be/api/?wsdl';
    }
    getSeasons() {
        return this.callOperation('GetSeasons', {});
    }
    getClubTeams(args) {
        return this.callOperation('GetClubTeams', args);
    }
    getDivisionRanking(args) {
        return this.callOperation('GetDivisionRanking', args);
    }
    getMatches(args) {
        return this.callOperation('GetMatches', args);
    }
    getMembers(args) {
        return this.callOperation('GetMembers', args);
    }
    getClubs(args) {
        return this.callOperation('GetClubs', args);
    }
    getDivisions(args) {
        return this.callOperation('GetDivisions', args);
    }
    getTournaments(args) {
        return this.callOperation('GetTournaments', args);
    }
    registerTournament(args) {
        return this.callOperation('TournamentRegister', args);
    }
    testRequest(args) {
        return this.callOperation('Test', args);
    }
    createClient() {
        return soap_1.createClientAsync(this.stub);
    }
    callOperation(operationToExecute, args) {
        return this.createClient()
            .then((client) => {
            // @ts-ignore
            return client[`${operationToExecute}Async`](args);
        })
            .then((result) => Promise.resolve(result[0]));
        ;
    }
}
exports.TabTRequestor = TabTRequestor;
//# sourceMappingURL=TabTRequestor.js.map