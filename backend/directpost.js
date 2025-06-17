const https = require('https');
const querystring = require('querystring');

class DirectPost {
    constructor(securityKey) {
        this.securityKey = securityKey;
    }

    setBilling(billingInformation) {
        const validBillingKeys = [
            'first_name', 'last_name', 'company', 'address1',
            'address2', 'city', 'state', 'zip', 'country', 'phone', 'fax', 'email'
        ];

        for (let key in billingInformation) {
            if (!validBillingKeys.includes(key)) {
                throw new Error(`Invalid billing key: '${key}' is not a valid billing parameter.`);
            }
        }

        this.billing = billingInformation;
    }

    setShipping(shippingInformation) {
        const validShippingKeys = [
            'shipping_first_name', 'shipping_last_name', 'shipping_company',
            'shipping_address1', 'address2', 'shipping_city', 'shipping_state',
            'shipping_zip', 'shipping_country', 'shipping_email'
        ];

        for (let key in shippingInformation) {
            if (!validShippingKeys.includes(key)) {
                throw new Error(`Invalid shipping key: '${key}' is not a valid shipping parameter.`);
            }
        }

        this.shipping = shippingInformation;
    }

    doACH(amount, checkName, routingNumber, accountNumber, accountType = 'checking') {
        const requestOptions = {
            type: 'sale',
            amount: amount,
            payment: 'check',
            checkname: checkName,
            checkaba: routingNumber,
            checkaccount: accountNumber,
            account_type: accountType,
            ...this.billing,
            ...this.shipping,
            security_key: this.securityKey
        };

        this._doRequest(requestOptions);
    }



    _doRequest(postData) {
        const hostName = 'ratetracker.transactiongateway.com';
        const path = '/api/transact.php';
        const postString = querystring.stringify(postData);

        const options = {
            hostname: hostName,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postString)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = querystring.parse(responseData);
                    console.log('✅ Parsed JSON-like response:', parsedData);
                } catch (error) {
                    console.error('❌ Failed to parse response:', error);
                    console.log('Raw response:', responseData);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Request error: ${e.message}`);
        });

        req.write(postString);
        req.end();
    }

    doACHRecurring(amount, checkName, routingNumber, accountNumber, accountType = 'checking') {
    const requestOptions = {
        type: 'sale',
        payment: 'check',
        amount: amount,
        checkname: checkName,
        checkaba: routingNumber,
        checkaccount: accountNumber,
        account_type: accountType,

        // Recurring billing params
        recurring: 'add_subscription',
        plan_payments: 12,          // e.g., 12 monthly payments
        plan_amount: amount,        // each payment amount
        month_frequency: 1,         // every month
        day_of_month: 1,             // ✅ CHARGE ON THE 15th EACH MONTH


        ...this.billing,
        ...this.shipping,
        security_key: this.securityKey
    };

    this._doRequest(requestOptions);
}


}

module.exports = DirectPost;
