const destinationNodeConfig = draft.processTemplate("[[tanaDestinationNodes]]");
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

var destinationNodes = readNodeConfig();
var content = buildTanaContent();

let p = Prompt.create();
p.title = "Select a node, or press 'OK' to send to the default node";
p.message = "Select the node to push to";
p.addSelect("node", "Nodes", Object.keys(destinationNodes), [], false);
p.addButton("OK");

selection = p.show();
if (selection) {
	let selected = p.fieldValues["node"].toString();
	// User does not have to select anything, in this case send to defaultNode
	if (selected) {
		dest = destinationNodes[selected];

		if (dest.length < 7) {
			alert(dest + " is not a valid Tana nodeID");
			context.fail("Tana: targetNodeId must be at least 7 characters; was: " + dest)
		}
		sendTana(content, dest)
	} else {
		sendTana(content)
	}
} else {
	// User clicked 'Cancel'; see ya!
	context.cancel();
}

function readNodeConfig(){
	/* Read the user's configured destination nodes
	into an object to be used in the Prompt and provided
	to the Tana API.
	*/
	let nodes = {};
	const sep = ",";
	for (let line of destinationNodeConfig.split('\n')) {
		line = line.trim();
		if (!line.match(/^-.*,.*$/)) {
			continue;
		}
		let nodeName, nodeId
		[nodeName, nodeId] = line.slice(1).trim().split(sep);
		nodes[nodeName.trim() + " [" + nodeId.trim() + "]"] = nodeId.trim()
	}
	return nodes;
}

function buildTanaContent() {
	/* Build a Tana-compatible JSON payload from the draft,
	based on the user's selected save mode.
	*/
	// Split the draft into lines, ignoring the title line
	const [, ...body] = draft.content.split('\n');
	switch (saveMode) {
		case "single":
			break;
		case "child":
			// Use the first line as a parent node, 
			// and the rest as one child node
			return [{
				name: draft.displayTitle,
				children: [
					{name: body.join('\n').replace(/\n/g,"")}
				]
			}];
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
			// no need for an error here, just use the "single" mode
			break;
	}
	return [{name: draft.content.replace(/\n/g,"")}];
}

function sendTana(contentObject, node=defaultNode) {
	/* Send the JSON content to the Tana API
	*/
	const url = "https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2";
	
	// apply a sane default in case the user has not set one
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
		// Note: the Tana API doesn't have the greatest errors,
		console.log(JSON.stringify(response));
		alert("Failed sending: " + response.responseText)
	}
}

