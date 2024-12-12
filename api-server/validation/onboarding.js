var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);


module.exports = {
	products: Joi.array().items(Joi.object().keys({
		Products: Joi.string().required(),
		Description: Joi.string().allow(null).allow('').optional(), 
		Amount: Joi.number().required(), 
		IsProductTaxable: Joi.string().trim().lowercase().valid('yes', 'no').required()
	})),

	spacemix: Joi.array().items(Joi.object().keys({
		//spaces
		Space: Joi.string().trim().alphanum().max(10).required().error(() => {
			return {
				message: 'Space is a required field and must be alphanumeric upto 10 characters'
			}
		}),
		Width: Joi.number().precision(2).min(0).max(999).invalid('').required(),
		Length: Joi.number().precision(2).min(0).max(999).invalid('').required(),
		Height: Joi.number().precision(2).min(0).max(99).invalid('').required(),
		Rate: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).required().error(() => {
			return {
				message: `'Rate' is a required field and must be a numeric value upto 8 digits`,
			}
		}),
		'Space Category':Joi.string().max(100).required(),
		'Door Width':Joi.number().min(0).max(999).precision(2).allow(null, '').optional(),
		'Door Height':Joi.number().min(0).max(999).precision(2).allow(null, '').optional(),
		Floor: Joi.string().max(10).regex(/^(?!.*(E[+]|e[+]))/).allow(null, '').optional().error(() => {
			return {
				message: 'Floor must be less than or equal to 10 characters long',
			}
		}),
		//tenant
		'First Name':Joi.string().allow(null).allow('').max(45).optional(),
        'Last Name':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).required(),
         }),
		'Middle Name':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().allow(null).allow('').max(45).optional(),
         }),
		Address:Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).required(),
         }),
		City:  Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).required(),
        }),
		State:Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).required(),
        }),
		ZIP: Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().alphanum().max(6).required().error(() => {
				return {
					message: 'ZIP must be required and alphanumeric upto 6 characters',
				}
			})
         }),
		Country:Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).allow(null).allow('').optional(),
         }),
		Email:Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().email({ minDomainAtoms: 2 }).max(45).allow(null).allow('').optional().error(() => {
				return {
					message: `'Email' must be a valid email`,
				}
			})
         }),
		'Cell Phone':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^[0-9]{10}$/).required().error(() => {
				return {
					message: `"Cell Phone" is not allowed to be empty and must be 10 digit.`,
				}
			  })
         }),
		'Home Phone':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().allow(null, '').optional().regex(/^[0-9]{10}$/).error(errors => {
				errors.forEach(err => {
				  switch (err.type) {
					case "string.regex.base":
					  err.message = `'Home Phone' must be 10 digit.`;
					  break;
				  }
				});
				return errors;
			  })
			}),
		'Work Phone': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().allow(null, '').optional().regex(/^[0-9]{10}$/).error(errors => {
				errors.forEach(err => {
				  switch (err.type) {
					case "string.regex.base":
					  err.message = `'Work Phone' must be 10 digit.`;
					  break;
				  }
				});
				return errors;
			  })
			}),
		'Access Code': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().alphanum().max(10).allow(null).allow('').optional().error(() => {
				return {
					message: 'Access Code must be alphanumeric and upto 10 characters',
				}
			})
		}),
		'DOB':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.date().format('MM/DD/YYYY').allow(null).allow('').optional().error(() => {
				return {
					message: 'DOB must be entered in the "MM/DD/YYYY" format',
				}
			})
		}),
		'Active Military':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().trim().lowercase().valid('yes', 'no').required().error(() => {
				return {
					message: `'Active Military' is a required field and should be either one [ yes, no ]`,
				}
			})
         }),
		 'CO First Name':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
		 }).when('Active Military', {
				is: 'yes',
				then:Joi.string().max(45).required(),
				otherwise: Joi.optional().allow(null, ""),
         }),
		 'CO Last Name':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
		 }).when('Active Military', {
				is: 'yes',
				then:Joi.string().max(45).required(),
				otherwise: Joi.optional().allow(null, ""),
         }),
		 'CO Cell Phone':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
		 }).when('Active Military', {
				is: 'yes',
				then:Joi.string().regex(/^[0-9]{10}$/).required().error(errors => {
					return {
						message: `"CO Cell Phone" is not allowed to be empty and must be 10 digit.`,
					}
				  }),
				otherwise: Joi.optional().allow(null, "")
         }),
		 'Military Serial Number':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
		 }).when('Active Military', {
				is: 'yes',
				then:Joi.string().max(45).required(),
				otherwise: Joi.optional().allow(null, ""),
         }),
		 'Military Branch':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
		 }).when('Active Military', {
				is: 'yes',
				then:Joi.string().max(45).required(),
				otherwise: Joi.optional().allow(null, ""),
         }),
		'DL Id': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().alphanum().max(10).allow(null, '').optional().error(() => {
				return {
					message: 'DL Id must be alphanumeric and upto 10 characters',
				}
			})
         }),
		'DL State': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).required(),
        }),
		'DL City':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).required(),
        }),
		'DL Exp Date': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.date().format('MM/DD/YYYY').required().error(() => {
				return {
					message: `'DL Exp Date' is a required field and must be entered in the "MM/DD/YYYY" format`,
				}
			})
        }),
		'Rent': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).required().error(() => {
				return {
					message: `'Rent' is a required field and must be a numeric value upto 8 digits`,
				}
			})
        }),
		'Move In Date': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.date().format('MM/DD/YYYY').required().error(() => {
				return {
					message: `'Move In Date' is a required field and must be entered in the "MM/DD/YYYY" format`,
				}
			})
        }),
		'Move Out Date': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.date().format('MM/DD/YYYY').allow(null).allow('').optional().error(() => {
				return {
					message: `'Move Out Date' must be entered in the "MM/DD/YYYY" format`,
				}
			})
        }),
		'Bill Date': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.date().format('MM/DD/YYYY').required().error(() => {
				return {
					message: `'Bill Date' is a required field and must be entered in the "MM/DD/YYYY" format`,
				}
			})
        }),
		'Paid Date': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.date().format('MM/DD/YYYY').required().error(() => {
				return {
					message: `'Paid Date' is a required field and must be entered in the "MM/DD/YYYY" format`,
				}
			})
        }),
		'Paid Through Date':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.date().format('MM/DD/YYYY').allow(null).allow('').optional().error(() => {
			return {
				message: `'Paid Through Date' must be entered in the "MM/DD/YYYY" format`,
			}
		})
	}),
		'Alt First Name':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().max(45).allow(null, '').optional()
		}),
		'Alt Last Name':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().max(45).allow(null, '').optional()
		}),
		'Alt Middle Name': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().max(45).allow(null, '').optional()
		}),
		'Alt Address':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().max(45).allow(null, '').optional()
		}),
		'Alt City': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().max(45).allow(null, '').optional()
		}),
		'Alt State':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(45).allow(null, '').optional()
		}),
		'Alt ZIP':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().alphanum().max(6).allow(null, '').optional().error(() => {
				return {
					message: 'Alt ZIP must be alphanumeric and upto 6 characters',
				}
			})
         }),
		'Alt Email': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).allow(null, '').optional()
		}),
		'Alt Home Phone': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().allow(null, '').optional().regex(/^[0-9]{10}$/).error(errors => {
			errors.forEach(err => {
			  switch (err.type) {
				case "string.regex.base":
				  err.message = `'Alt Home Phone' must be 10 digit.`;
				  break;
			  }
			});
			return errors;
		  })
		}),
		'Alt Work Phone': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().allow(null, '').optional().regex(/^[0-9]{10}$/).error(errors => {
			errors.forEach(err => {
			  switch (err.type) {
				case "string.regex.base":
				  err.message = `'Alt Work Phone' must be 10 digit.`;
				  break;
			  }
			});
			return errors;
		  })
		}),
		'Alt Cell Phone': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.string().allow(null, '').optional().regex(/^[0-9]{10}$/).error(errors => {
			errors.forEach(err => {
			  switch (err.type) {
				case "string.regex.base":
				  err.message = `'Alt Cell Phone' must be 10 digit.`;
				  break;
			  }
			});
			return errors;
		  })
		}),
		// payment
        'Rent Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^[-]?(?=.*\d)\d{0,8}(\.\d{1,2})?$/).required().error(() => {
				return {
					message: `'Rent Balance' is a required field and must be a numeric value upto 8 digits`,
				}
			}),
        }),
         'Fees Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Fees Balance' must be a numeric value upto 8 digits`,
				}
			})
		}),
         'Protection/Insurance Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Protection/Insurance Balance' must be a numeric value upto 8 digits`,
				}
			})
		}),
         'Merchandise Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Merchandise Balance' must be a numeric value upto 8 digits`,
				}
			})
		}),
        'Late Fees Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Late Fees Balance' must be a numeric value upto 8 digits`,
				}
			})
		}),
        'Lien Fees Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^[-]?(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Lien Fees Balance' must be a numeric value upto 8 digits`,
				}
			})
		}),
        'Tax Balance':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Tax Balance' must be a numeric value upto 8 digits`,
				}
			})
		}),
         'Prepaid Rent':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Prepaid Rent' must be a numeric value upto 8 digits`,
				}
			})
		}),
         'Prepaid Additional Rent/Premium':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
				return {
					message: `'Prepaid Additional Rent/Premium' must be a numeric value upto 8 digits`,
				}
			})
		}),
         'Prepaid Tax':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
			return {
				message: `'Prepaid Tax' must be a numeric value upto 8 digits`,
			}
		})
	}),
        'Protection/Insurance Provider':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().allow(null).allow('').optional().error(() => {
			return {
				message: `'Protection/Insurance Provider' must be a string.`,
			}
		})
	}),
         'Protection/Insurance Coverage':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
			return {
				message: `'Protection/Insurance Coverage' must be a numeric value upto 8 digits`,
			}
		})
	}),
        'Additional Rent/Premium':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^(?=.*\d)\d{0,8}(\.\d{1,2})?$/).allow(null).allow('').optional().error(() => {
			return {
				message: `'Additional Rent/Premium' must be a numeric value upto 8 digits`,
			}
		})
	}),
         'Delinquency Status':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().trim().lowercase().valid('yes', 'no').allow(null, '').optional().error(() => {
			return {
				message: `'Delinquency Status' should be either one [ yes, no ]`,
			}
		})
	})
	})),

	    
	promotions: Joi.array().items(Joi.object().keys({	//promotions
		Promotion:Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(255).allow(null, '').optional()
		}),
	   'Promotion Type':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, "")
		})
		.when('Promotion', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().trim().lowercase().valid('$', '%','fixed rate').required(),
        })
	   .error(() => {
			return {
				message: `"Promotion Type" is not allowed to be empty and must be one of [$, %, Fixed Rate]`,
			}
		}),		
		'Promotion Value': Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, "")
		})
		.when('Promotion', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.required(),
        }).when('Promotion Type', { 
            is: '%', 
            then: Joi.number().precision(2).min(0).max(100).required(), 
            otherwise: Joi.number().precision(2).min(0).max(999).required(),
        }),
		'Promotion Start Date':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, "")
		}).when('Promotion', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.date().format('MM/DD/YYYY').required(),
        }).error(() => {
			return {
				message: `'Promotion Start Date' must be entered in the "MM/DD/YYYY" format`,
			}
		}),
		'Promotion Length':Joi
		.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, "")
		})
		.when('Promotion', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().regex(/^[0-9]{1,10}$/).required(),
        })
		.error(() => {
			return {
				message: `Promotion Length' is not allowed to be empty and must be a number upto 10 digits`,
			}
		  }),
		 Discount:Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().max(255).allow(null, "").optional()
		 }),
		'Discount Type':Joi
		.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, "")
		})
		.when('Discount', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.string().trim().lowercase().valid('$', '%','fixed rate').required(),
        })
		.error(() => {
			return {
				message: `"Discount Type" is not allowed to be empty and must be one of [$, %, Fixed Rate]`,
			}
		}),
		'Discount Value':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
		})
		.when('Discount', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise: Joi.required(),
        }).when('Discount Type', { 
            is: '%', 
            then: Joi.number().precision(2).min(0).max(100).required(), 
            otherwise: Joi.number().precision(2).min(0).max(999).required(),
        }),
		'Discount Start Date':Joi.when('First Name', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, "")
		}).when('Discount', {
			is: Joi.any().valid(null, ""),
			then: Joi.optional().allow(null, ""),
			otherwise:Joi.date().format('MM/DD/YYYY').required(),
        }).error(() => {
			return {
				message: `'Discount Start Date' must be entered in the "MM/DD/YYYY" format`,
			}
		})
	}))
}