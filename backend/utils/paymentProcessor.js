const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
//require axio 
const DirectPost = require('../directpost');

const sdkConstants = require('authorizenet').Constants;

// console.log("Login ID:", process.env.AUTH_NET_LOGIN_ID);
// console.log("Transaction Key:", process.env.AUTH_NET_TRANSACTION_KEY);
// ApiControllers.setEnvironment(sdkConstants.endpoint.sandbox);

exports.processCreditCard = (cardNumber, amount, expiry) => {
    return new Promise((resolve, reject) => {
        try {
            const merchantAuthentication = new ApiContracts.MerchantAuthenticationType();
            merchantAuthentication.setName(process.env.AUTH_NET_LOGIN_ID);
            merchantAuthentication.setTransactionKey(process.env.AUTH_NET_TRANSACTION_KEY);

            const creditCard = new ApiContracts.CreditCardType();
            creditCard.setCardNumber(cardNumber);  // <-- use argument now
            creditCard.setExpirationDate(expiry);  // <-- use argument now
            // creditCard.setCardCode('999');

            const paymentType = new ApiContracts.PaymentType();
            paymentType.setCreditCard(creditCard);

            const transactionRequest = new ApiContracts.TransactionRequestType();
            transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
            transactionRequest.setAmount(amount);  // <-- use argument now
            transactionRequest.setPayment(paymentType);

            const createRequest = new ApiContracts.CreateTransactionRequest();
            createRequest.setMerchantAuthentication(merchantAuthentication);
            createRequest.setTransactionRequest(transactionRequest);

            const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
            ctrl.setEnvironment(sdkConstants.endpoint.production);  // Use SANDBOX for testing
            // ctrl.setEnvironment('https://apitest.authorize.net/xml/v1/request.api');  // SANDBOX

            ctrl.execute(() => {
                try {
                    const apiResponse = ctrl.getResponse();
                    const response = new ApiContracts.CreateTransactionResponse(apiResponse);

                    console.log("Authorize.Net Full Response:", JSON.stringify(response, null, 2));

                    if (response.getMessages().getResultCode() === "Ok") {
                        console.log("Transaction Successful:", response.getTransactionResponse().getTransId());
                        resolve(true);
                    } else {
                        console.error("Transaction Failed:", response.getMessages().getMessage()[0].getText());
                        resolve(false);
                    }
                } catch (innerError) {
                    console.error("Error processing API response:", innerError);
                    reject(innerError);
                }
            });

        } catch (error) {
            console.error("Error building payment request:", error);
            reject(error);
        }
    });
};


exports.processACH = async (routingNumber, accountNumber) => {
    try {
        const dp = new DirectPost(process.env.RATE_TRACKER);

        const billingInfo = {
            first_name: 'Jane',
            last_name: 'Doe',
            address1: '456 Elm St',
            city: 'Chicago',
            state: 'IL',
            zip: '60601'
        };

        const shippingInfo = {
            shipping_first_name: 'Jane',
            shipping_last_name: 'Doe',
            shipping_address1: '456 Elm St',
            shipping_city: 'Chicago',
            shipping_state: 'IL',
            shipping_zip: '60601'
        };

        // Uncomment if you want to set billing/shipping
        // dp.setBilling(billingInfo);
        // dp.setShipping(shippingInfo);

        const amount = '49.99';
        const checkName = 'Jane Doe';
        const accountType = 'checking';

        const response = await dp.doACHRecurring(
            amount,
            checkName,
            routingNumber,
            accountNumber,
            accountType
        );

        console.log('✅ ACH Recurring Success:', response);
        return true;

    } catch (err) {
        console.error('❌ Error processing ACH payment:', err.message);
    }
};

