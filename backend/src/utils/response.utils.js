// 성공
const success = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = {
        success: true,
        message,
    };

    if (data) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

// 페이지네이션
const paginate = (res, items, pagination, mesage = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data: items,
        pagination,
    });
};

// 에러
const error = (
    res,
    statusCode = 500,
    message = 'Server Error',
    details = null
) => {
    const response = {
        success: false,
        message,
    };

    if (details) {
        response.details = details;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    success,
    paginate,
    error,
};
