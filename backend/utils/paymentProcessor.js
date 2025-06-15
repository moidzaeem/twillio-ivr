const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
const sdkConstants = require('authorizenet').Constants;

exports.processCreditCard = (cardNumber, amount) => {
    return new Promise((resolve) => {
        const merchantAuthentication = new ApiContracts.MerchantAuthenticationType();
        merchantAuthentication.setName(process.env.AUTH_NET_LOGIN_ID);
        merchantAuthentication.setTransactionKey(process.env.AUTH_NET_TRANSACTION_KEY);

        const creditCard = new ApiContracts.CreditCardType();
        creditCard.setCardNumber(cardNumber);
        creditCard.setExpirationDate("2025-12");

        const paymentType = new ApiContracts.PaymentType();
        paymentType.setCreditCard(creditCard);

        const transactionRequest = new ApiContracts.TransactionRequestType();
        transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
        transactionRequest.setAmount(amount);
        transactionRequest.setPayment(paymentType);

        const createRequest = new ApiContracts.CreateTransactionRequest();
        createRequest.setMerchantAuthentication(merchantAuthentication);
        createRequest.setTransactionRequest(transactionRequest);

        const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
        ctrl.execute(() => {
            const apiResponse = ctrl.getResponse();
            const response = new ApiContracts.CreateTransactionResponse(apiResponse);
            resolve(response.getMessages().getResultCode() === "Ok");
        });
    });
};

exports.processACH = (routingNumber, accountNumber, amount) => {
    return new Promise((resolve) => {
        const merchantAuthentication = new ApiContracts.MerchantAuthenticationType();
        merchantAuthentication.setName(process.env.AUTH_NET_LOGIN_ID);
        merchantAuthentication.setTransactionKey(process.env.AUTH_NET_TRANSACTION_KEY);

        const bankAccount = new ApiContracts.BankAccountType();
        bankAccount.setAccountType(ApiContracts.BankAccountTypeEnum.CHECKING);
        bankAccount.setRoutingNumber(routingNumber);
        bankAccount.setAccountNumber(accountNumber);
        bankAccount.setNameOnAccount("IVR User");

        const paymentType = new ApiContracts.PaymentType();
        paymentType.setBankAccount(bankAccount);

        const transactionRequest = new ApiContracts.TransactionRequestType();
        transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
        transactionRequest.setAmount(amount);
        transactionRequest.setPayment(paymentType);

        const createRequest = new ApiContracts.CreateTransactionRequest();
        createRequest.setMerchantAuthentication(merchantAuthentication);
        createRequest.setTransactionRequest(transactionRequest);

        const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
        ctrl.execute(() => {
            const apiResponse = ctrl.getResponse();
            const response = new ApiContracts.CreateTransactionResponse(apiResponse);
            resolve(response.getMessages().getResultCode() === "Ok");
        });
    });
};
