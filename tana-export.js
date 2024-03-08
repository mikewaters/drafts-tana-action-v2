const defaultNode = draft.processTemplate("[[tanaDefaultNode]]").trim();
const saveMode = draft.processTemplate("[[tanaSaveMode]]").trim(); 

const credential = Credential.create(
  "tana-workspace", 
  "Tana.inc\nPress cmd+k and select 'Get API Token' on your inbox node"
);

credential.addPasswordField(
  "token",
  "Token",
);

if (!credential.authorize()) {
  alert("No API token provided or found.");
  context.fail(
    "Tana API token not entered, or not found. Clear API token and try again if no prompt was provided."
  );
}

var content = buildTanaContent();
sendTana(content)

function buildTanaContent() {
	// builds a json payload
	// Just send the whole draft as a Tana node unless the mode is "child"
	const [, ...body] = draft.content.split('\n');
	switch (saveMode) {
		case "single":
			break;
		case "child":
			// Use the first line as a parent node, 
			// and the rest as a child node
			
			return [{
				name: draft.displayTitle,
				children: [
					{name: body.join('\n').replace(/\n/g,"")}
				]
			}];
			//{name: body.join('\n').replace(/\n/g,"")}
		case "children":
			// Use the first line as a parent node,
			// and the rest of the draft - split by newlines -
			// as child nodes
			let c = [];
			for (let line of body) {
				if (line.trim().length > 0) {
					c.push({name: line})
				}
			}
			return [{
				name: draft.displayTitle,
				children: c
			}];
		default:
			console.log("Unexpected save mode: '" + saveMode + "'; assuming 'single'")
			break;
	}
	return [{name: draft.content.replace(/\n/g,"")}];
}

function sendTana(contentObject, node=defaultNode) {
	const url = "https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2";
    if (defaultNode.trim().length == 0) {
		node="INBOX";
	}
    let payload = {  
    	targetNodeId: node,  
      	nodes: contentObject
	};
	let http = HTTP.create();
	let ttok = credential.getValue("token");
	let req = {
  		url: url,
  		"method": "POST",
  		"headers": {
    		  "Authorization": "Bearer " + ttok,
    		  "Content-Type": "application/json"
		},
  		"data": payload
	}
	let response = http.request(req);
	if (!response.success){
		alert("Failed sending: " + response.responseText)
	}
}

