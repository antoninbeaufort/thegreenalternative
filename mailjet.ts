import "https://deno.land/x/dotenv/load.ts";
import {
    json,
    serve,
    validateRequest,
} from "https://deno.land/x/sift@0.4.2/mod.ts";

const MAILJET_API_URL = 'https://api.mailjet.com/v3/REST'
const MAILJET_NEXT_API_URL = 'https://api.mailjet.com/v3.1'

const headers = new Headers();
headers.set('Content-Type', 'application/json')
headers.set('Authorization', 'Basic ' + btoa(Deno.env.get('MJ_APIKEY_PUBLIC') + ":" + Deno.env.get('MJ_APIKEY_PRIVATE')));

const addContact = (email: string): Promise<any> => {
    return fetch(MAILJET_API_URL + '/contact', {
        method: "POST",
        headers,
        body: JSON.stringify({
            Email: email,
        }),
    });
}

const addListRecipient = (email: string): Promise<any> => {
    return fetch(MAILJET_API_URL + '/listrecipient', {
        method: "POST",
        headers,
        body: JSON.stringify({
            ContactAlt: email,
            ListID: '48456',
        }),
    });
}

const sendEmail = (messages: any): Promise<any> => {
    return fetch(MAILJET_NEXT_API_URL + '/send', {
        method: "POST",
        headers,
        body: JSON.stringify({
            Messages: messages,
        }),
    });
}

serve({
    "/suscribe": handleSuscribeRequest,
    "/send": handleSendRequest,
});

async function handleSuscribeRequest(request: any) {
    const { error, body } = await validateRequest(request, {
        POST: {
            body: ['email']
        },
    })
    if (error) {
        return json({ error: error.message }, { status: error.status });
    }
    // @ts-ignore: Unreachable code error
    const resAddContact = await addContact(body!.email)
    if (!resAddContact.ok) {
        return json({}, { status: 500 })
    }
    // @ts-ignore: Unreachable code error
    const resAddListRecipient = await addListRecipient(body!.email)
    if (!resAddListRecipient.ok) {
        return json({}, { status: 500 })
    }
    return json({}, { status: 201 })
}

async function handleSendRequest(request: any) {
    const { error, body } = await validateRequest(request, {
        POST: {
            body: [
                'email',
                'firstName',
                'lastName',
                'message',
                'subject',
            ],
        },
    })
    if (error) {
        return json({ error: error.message }, { status: error.status });
    }

    const messageText = `
        Nouveau message en provenance du formulaire de contact\n\n
        Prénom : ${body!.firstName}\n
        Nom : ${body!.lastName}\n
        Téléphone : ${body?.phone}\n
        \n\n
        ${body!.message}
      `
    const messageHTML = `
        Nouveau message en provenance du formulaire de contact<br><br>
        Prénom : ${body!.firstName}<br>
        Nom : ${body!.lastName}<br>
        Téléphone : ${body?.phone}<br>
        <br><br>
        ${body!.message}
    `

    const response = await sendEmail([
        {
            From: {
                Email: 'formulairedecontact@thegreenalternative.fr',
                Name: 'The Green Alternative - Formulaire de Contact'
            },
            To: [
                {
                    Email: 'thegreenalternative.contact@gmail.com',
                    Name: 'The Green Alternative',
                },
            ],
            Subject: 'Formulaire de contact : ' + body!.subject,
            TextPart: messageText,
            HTMLPart: messageHTML,
            Headers: {
                'Reply-To': body!.email,
            },
        },
    ])
    if (response.ok) {
        return json({}, { status: 201 })
    } else {
        return json({}, { status: 500 })
    }
}
