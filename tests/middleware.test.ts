import { NextFunction, Request, Response } from 'express';
import { ApiProblem, ApiProblemOptionsType, ExpressProblemMiddleware } from '../lib';

describe('middleware', () => {
  let res: Response;
  let resHeader: jest.Mock;
  let resStatus: jest.Mock;
  let resJson: jest.Mock;

  function setUpExpressMocks() {
    resJson = jest.fn();
    resStatus = jest.fn();
    resHeader = jest.fn();
    res = {
      header: resHeader,
      status: resStatus,
      json: resJson,
    } as any;

    resJson.mockImplementation(() => res);
    resStatus.mockImplementation(() => res);
    resHeader.mockImplementation(() => res);
  }

  beforeAll(setUpExpressMocks);
  afterEach(() => jest.clearAllMocks());

  it.each([[undefined], [null], [false], [{}], [{ value: 'some' }], [4]])(
    'should ignore any non errors and call next',
    (errorParam: any) => {
      const req: Request = jest.fn() as any;
      const res: Response = jest.fn() as any;
      const next: NextFunction = jest.fn() as any;

      ExpressProblemMiddleware()(errorParam, req, res, next);

      expect(req).not.toHaveBeenCalled();
      expect(res).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    },
  );

  it('should respond with API problem response for ApiProblem', () => {
    const req: Request = jest.fn() as any;
    const next: NextFunction = jest.fn() as any;

    const problemParams: ApiProblemOptionsType = {
      status: 400,
      title: 'Bad Request',
      detail: 'Some bad request',
      type: 'Some type',
      additional: {
        more: 'options to be merged outside',
      },
    };

    ExpressProblemMiddleware()(new ApiProblem(problemParams), req, res, next);

    expect(next).not.toHaveBeenCalled();

    expect(resHeader).toHaveBeenCalledTimes(1);
    expect(resStatus).toHaveBeenCalledTimes(1);
    expect(resJson).toHaveBeenCalledTimes(1);

    expect(resHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/problem+json',
    );
    expect(resStatus).toHaveBeenCalledWith(400);
    expect(resJson).toHaveBeenCalledWith(
      JSON.stringify({
        ...problemParams,
        additional: undefined,
        more: 'options to be merged outside',
      }),
    );
  });

  it('should respond with API problem response for Error', () => {
    const req: Request = jest.fn() as any;
    const next: NextFunction = jest.fn() as any;

    const problemParams: ApiProblemOptionsType = {
      status: 500,
      title: 'Server Error',
      detail: 'Database connection failed',
    };

    ExpressProblemMiddleware({ stackTrace: false })(
      new Error('Database connection failed'),
      req,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();

    expect(resHeader).toHaveBeenCalledTimes(1);
    expect(resStatus).toHaveBeenCalledTimes(1);
    expect(resJson).toHaveBeenCalledTimes(1);

    expect(resHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/problem+json',
    );
    expect(resStatus).toHaveBeenCalledWith(500);
    expect(resJson).toHaveBeenCalledWith(JSON.stringify(problemParams));
  });

  it('should honor the options passed', () => {
    const req: Request = jest.fn() as any;
    const next: NextFunction = jest.fn() as any;

    ExpressProblemMiddleware({
      stackTrace: true,
      contentType: 'some-content-type',
    })(new Error('Database connection failed'), req, res, next);

    expect(next).not.toHaveBeenCalled();

    expect(resHeader).toHaveBeenCalledTimes(1);
    expect(resStatus).toHaveBeenCalledTimes(1);
    expect(resJson).toHaveBeenCalledTimes(1);

    expect(resHeader).toHaveBeenCalledWith('Content-Type', 'some-content-type');
    expect(resStatus).toHaveBeenCalledWith(500);

    // Because we have the stack trace enabled, we can't have the exact "expect" match
    // @todo write custom matcher and match the object format without stack
    expect(resJson).toHaveBeenCalledWith(
      expect.stringContaining('Database connection failed'),
    );
    expect(resJson).toHaveBeenCalledWith(
      expect.stringContaining('Server Error'),
    );
    expect(resJson).toHaveBeenCalledWith(expect.stringContaining('500'));
  });
});
