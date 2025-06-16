const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
//require axio 
const axios = require('axios');

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
            ctrl.setEnvironment('https://apitest.authorize.net/xml/v1/request.api');  // SANDBOX

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


exports.processACH = async (routingNumber, accountNumber ) => {
    console.log('wawow');
    try {
        // Your credentials
        const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(process.env.AUTH_NET_LOGIN_ID);
        merchantAuthenticationType.setTransactionKey(process.env.AUTH_NET_TRANSACTION_KEY);

        // Create bank account info
        const bankAccountType = new ApiContracts.BankAccountType();
        bankAccountType.setAccountType(ApiContracts.BankAccountTypeEnum.CHECKING);  // CHECKING, SAVINGS, BUSINESSCHECKING
        bankAccountType.setRoutingNumber(routingNumber);
        bankAccountType.setAccountNumber(accountNumber);
        bankAccountType.setNameOnAccount('Jt');

        // Payment type (ACH)
        const paymentType = new ApiContracts.PaymentType();
        paymentType.setBankAccount(bankAccountType);

        // Transaction request setup
        const transactionRequestType = new ApiContracts.TransactionRequestType();
        transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
        transactionRequestType.setAmount(49.99);
        transactionRequestType.setPayment(paymentType);

        // Full request object
        const createRequest = new ApiContracts.CreateTransactionRequest();
        createRequest.setMerchantAuthentication(merchantAuthenticationType);
        createRequest.setTransactionRequest(transactionRequestType);

        // Controller to execute the API request
        const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
        ctrl.setEnvironment('https://apitest.authorize.net/xml/v1/request.api');  // SANDBOX

        // Use SANDBOX for testing
        ctrl.execute(() => {
            const apiResponse = ctrl.getResponse();

            const response = new ApiContracts.CreateTransactionResponse(apiResponse);

            if (response != null) {
                if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
                    const transactionResponse = response.getTransactionResponse();
                    if (transactionResponse.getResponseCode() === '1') {
                        console.log('Transaction Successful!');
                        console.log('Transaction ID:', transactionResponse.getTransId());
                    } else {
                        console.log('Transaction Failed.');
                        console.log(transactionResponse.getErrors());
                    }
                } else {
                    console.log( response.getMessages().getMessage());
                    console.log('Result Code: ' + response.getMessages().getResultCode());
                    console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
                    console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
                }
            } else {
                console.log('Null Response.');
            }
        });
    } catch (error) {
        console.error('Error processing ACH payment:', error);
        return error;
        throw error;
    }
};

