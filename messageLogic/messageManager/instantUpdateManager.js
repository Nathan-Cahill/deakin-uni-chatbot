const replies = {
    initiateConversation:  `I will happily update you on a unit. Can you please let me know the unit code and i'll get right on it!`,
    unitCodeResponse: `Thank-you! Your tasks this month include: ${instantUpdate}`,
    
}

const getResponse = (newUserMessage, lastUserMessage) => {
    let action = null;
    let value = null;
    if (lastUserMessage == "update" && isInterval(newUserMessage)){
        return {
            message: `Thank-you! Your tasks this month include:`,
            options: [{action: action, value: value}]
        }
    }

    if (newUserMessage == unitCode){
        return{
            message: replies.instantUpdate, 
        };
    }
}

const initiateConversation = () => {
    return replies.initiateConversation;
}


const instantUpdate = (unitDocs) => {
    unitDocs = JSON.parse(unitDocs)
    let responses = [];
    for (let i = 0; i < unitDocs.length; i++){
        let assessmentOverview = unitDocs[i].unit_name + "\n";
        for (let j = 0; j < unitDocs[i].assessments.length; j++){
            if (unitDocs[i].assessments[j].end_date == ""){
                assessmentOverview += `${unitDocs[i].assessments[j].name} - ${unitDocs[i].assessments[j].value*100}%\n`;
            } else {
                assessmentOverview += `${unitDocs[i].assessments[j].name} - ${unitDocs[i].assessments[j].value*100}% - due ${unitDocs[i].assessments[j].end_date}\n`;
            }
        }
        responses.push(assessmentOverview);
    }
    return responses;
}




module.exports = {
    initiateConversation,
    instantUpdate,
    getResponse,
   
}