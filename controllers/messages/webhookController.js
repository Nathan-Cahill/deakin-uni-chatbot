const messageLogicRouter = require('../../messageLogic/messageLogicRouter');
const lastConversationService = require('../../services/messages/lastConversationService');
const messageService = require('../../services/messages/messageService');
const unitService = require('../../services/topic/unitService');
const request = require('request-promise');


const sendMessage = async (requestBody, conversationObject) => {
  messageService.callGraphApi("POST", requestBody);
        //on successful message, update the LastConversation doc to reference in future messages. Maintains state of convo.
        let conversation= {
          psId: requestBody.recipient.id,
          topic: conversationObject.topic,
          userMessage: conversationObject.userMessage,
          botMessage: conversationObject.botMessage
        };
          
        lastConversationService.updateLastConversation(conversation).then(success => {
          if (!success){
              console.log('UPDATE CONV AFTER MESSAGE SENT - FAIL')
            } else {
              console.log('UPDATE CONV AFTER MESSAGE SENT - SUCCESS')
            }
        })
}



const receivePrompt =  async (req, res) => {
  let body = req.body;  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(async function(entry) {
        // Gets the body of the webhook event
        let webhookEvent = entry.messaging[0];     
        // Get the sender PSID
        let senderPsid = webhookEvent.sender.id;
        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhookEvent.message) {
          console.log(`${webhookEvent.message.text} by ${senderPsid}`);
        
  //           // indicate to user that the messaged was received with the typing indicator bubble ( . . . )
            // messageService.callGraphApi("POST", {"recipient": {"id": senderPsid}, "sender_action": "typing_on"});

            let conversationObject = await messageLogicRouter.routeMessage(senderPsid, webhookEvent.message.text);
            
            // add new user message to object to be uploaded to last conversation doc
            conversationObject['userMessage'] = webhookEvent.message.text;


            if (typeof(conversationObject) != 'undefined'){
              console.log(`cont.52 ${conversationObject}`);
              console.log(conversationObject);

              
              if (Array.isArray(conversationObject.options)){                
                for (let i = 0; i < conversationObject.options.length; i++){
                  switch(conversationObject.options[i].action){
                    case "unitOverview":
                      // let success = await services.unitSerivce.resetUnits(senderPsid);
                      // if (!success){  conversationObject.message = null; }
                      await unitService.addUnit(senderPsid, conversationObject.options[i].value);
                      // let unitDocs = await unitService.getUnitsWithPsid(senderPsid);
                      //get message with unit docs
                      //add message to conversationObject.botMessage array
                      break;
                    case "addUnit":
                      await unitService.addUnit(senderPsid, conversationObject.options[i].value);
                      break;
                    case null:
                      break;
                  }
                }
              }
             
            

              //send multiple responses
              if (Array.isArray(conversationObject.botMessage)){
                for (let i = 0; i < conversationObject.botMessage.length; i++){
                   console.log(`controller.77`);                
                console.log(`${conversationObject.botMessage[i]}`);
                  let requestBody = {
                    "recipient": {
                      "id": senderPsid
                    },
                    "message": {"text": conversationObject.botMessage[i]}
                  };
                  await messageService.callGraphApi(requestBody);
                }
                lastConversationService.updateLastConversation({
                    psId: senderPsid,
                    topic: conversationObject.topic,
                    userMessage: conversationObject.userMessage,
                    botMessage: conversationObject.botMessage 
                  });
              }



              //send single response  
     
              else if (conversationObject.botMessage != null){
                console.log(`controller.98`);                
                console.log(`${conversationObject}`);
                let requestBody = {
                  "recipient": {
                    "id": senderPsid
                  },
                  "message": {"text": conversationObject.botMessage}
                };
                await messageService.callGraphApi(requestBody);
                lastConversationService.updateLastConversation({
                  psId: senderPsid,
                  topic: conversationObject.topic,
                  userMessage: conversationObject.userMessage,
                  botMessage: conversationObject.botMessage
                });
              } 
          }
            
            // if an options request was unsuccessful, i.e., units were not reset in database
            else {
              let requestBody = {
                "recipient": {
                  "id": senderPsid
                },
                "message": {"text": "Something went wrong. Can you re-enter your last message?"}
              };
              await messageService.callGraphApi(requestBody);
            }
            
      }
  //     //Facebook requires early 200 code http response
  });
  res.status(200).send('EVENT_RECEIVED');
}
       



const verifyWebhook = (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
}


module.exports = {
    sendMessage,
    verifyWebhook, 
    receivePrompt
}