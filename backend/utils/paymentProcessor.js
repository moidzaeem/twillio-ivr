const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;


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


exports.processACH = (routingNumber, accountNumber, amount) => {
    return new Promise((resolve, reject) => {
        try {
            console.log('Initiating ACH transaction...');

            const merchantAuthentication = new ApiContracts.MerchantAuthenticationType();
            merchantAuthentication.setName(process.env.AUTH_NET_LOGIN_ID);
            merchantAuthentication.setTransactionKey(process.env.AUTH_NET_TRANSACTION_KEY);

            const bankAccount = new ApiContracts.BankAccountType();
            bankAccount.setAccountType(ApiContracts.BankAccountTypeEnum.CHECKING);
            bankAccount.setRoutingNumber('123123');  // <-- use argument
            bankAccount.setAccountNumber('123123123213');  // <-- use argument
            bankAccount.setNameOnAccount("IVR User");

            const paymentType = new ApiContracts.PaymentType();
            paymentType.setBankAccount(bankAccount);

            const transactionRequest = new ApiContracts.TransactionRequestType();
            transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
            transactionRequest.setAmount(amount);  // <-- use argument
            transactionRequest.setPayment(paymentType);

            const createRequest = new ApiContracts.CreateTransactionRequest();
            createRequest.setMerchantAuthentication(merchantAuthentication);
            createRequest.setTransactionRequest(transactionRequest);

            const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
            ctrl.execute(() => {
                try {
                    const apiResponse = ctrl.getResponse();
                    const response = new ApiContracts.CreateTransactionResponse(apiResponse);

                    const resultCode = response.getMessages().getResultCode();
                    console.log('Authorize.Net Result Code:', resultCode);

                    if (resultCode === "Ok") {
                        resolve(true);
                    } else {
                        console.error('Transaction failed:', response.getMessages());
                        resolve(false);
                    }
                } catch (innerError) {
                    console.error('Error processing Authorize.Net response:', innerError);
                    reject(innerError);
                }
            });
        } catch (error) {
            console.error('Error initiating ACH transaction:', error);
            reject(error);
        }
    });
};
